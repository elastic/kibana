# Testing OpenAI (Other) PKI Authentication

A working end-to-end procedure for testing the `.gen-ai` connector's PKI (mutual-TLS)
authentication for the **OpenAI → Other** provider, using a local Ollama instance behind
an nginx mTLS proxy. Covers only the **preconfigured connector** path as create UI for all OpenAI connectors was deprecated in 9.6 on [Kibana#276237](https://github.com/elastic/kibana/pull/276237).
Related: [Kibana#219984](https://github.com/elastic/kibana/pull/219984) (the PKI implementation). Internal reference doc:
"Instructions for Ollama setup with PKI Authentication" — ping Steph Milovic for help.

---

## 1. Generate a fresh cert set

Run in an empty working directory. This creates a CA, a server cert, and a client cert,
and writes base64 blobs for the connector to `connector-blobs.txt`.

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- CA ---
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.crt \
  -subj "/C=US/ST=Test/L=Test/O=TestCA/CN=TestRootCA"

# --- Server (CN must match the host Kibana dials) ---
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=Test/L=Test/O=TestServer/CN=localhost"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256

# --- Client (this pair goes into the connector) ---
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
  -subj "/C=US/ST=Test/L=Test/O=TestClient/CN=client"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days 365 -sha256

# --- Base64 blobs for the connector (single-line, macOS + Linux safe) ---
b64() { base64 < "$1" | tr -d '\n'; }
{
  echo "=== CLIENT CERTIFICATE (client.crt) ==="; b64 client.crt; echo
  echo; echo "=== CLIENT PRIVATE KEY (client.key) ==="; b64 client.key; echo
  echo; echo "=== CA CERTIFICATE (ca.crt) ==="; b64 ca.crt; echo
} > connector-blobs.txt

echo "Done. Blobs written to connector-blobs.txt"
```

**Tip:** if you run the script by double-clicking, the terminal window closes before you can
read errors. Open a terminal yourself, `cd` to the directory, and run `bash generate_certs.sh`.

### Verify the cert set before going further (optional but recommended)

```bash
# terminal 1 — test server requiring a client cert signed by our CA
openssl s_server -accept 8443 -cert server.crt -key server.key -CAfile ca.crt -Verify 1 -www

# terminal 2 — connect with the client pair
openssl s_client -connect localhost:8443 -cert client.crt -key client.key -CAfile ca.crt
```

Success looks like `verify return:1` on the server side and `Verify return code: 0 (ok)` on
the client side. `Ctrl-C` both when done. This only checks the handshake, not the API.

---

## 2. Stand up Ollama behind an mTLS proxy

Create the two config files **in the same directory as the certs**. The Ollama image
runs via Docker below; pull the model inside that container after `compose up` (do not
`ollama pull` on the host first, it needs a local `ollama serve` and is unused by this
setup).

`docker-compose.yml`:

```yaml
services:
  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    command: serve

  nginx-proxy:
    image: nginx:latest
    ports:
      - "443:443"
    volumes:
      - ./server.crt:/etc/nginx/server.crt
      - ./server.key:/etc/nginx/server.key
      - ./ca.crt:/etc/nginx/ca.crt
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - ollama

volumes:
  ollama_data:
```

`nginx.conf` — write it with a quoted heredoc so the shell does NOT expand `$host`:

```bash
cat > nginx.conf << 'EOF'
events {}
http {
  server {
    listen 443 ssl;
    server_name localhost;
    ssl_certificate     /etc/nginx/server.crt;
    ssl_certificate_key /etc/nginx/server.key;
    ssl_client_certificate /etc/nginx/ca.crt;
    ssl_verify_client on;
    location / {
      proxy_pass http://ollama:11434;
      proxy_set_header Host $host;
    }
  }
}
EOF
```

### Bring it up

```bash
# confirm all seven files are present first
ls ca.crt server.crt server.key client.crt client.key docker-compose.yml nginx.conf

docker compose up -d
docker compose ps                                  # both containers should be Up
docker compose exec ollama ollama pull llama3.1:8b # pull INSIDE the container's volume
```

### Smoke test the mTLS path

```bash
curl --cert client.crt --key client.key --cacert ca.crt \
  https://localhost/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b","messages":[{"role":"user","content":"Hello"}],"stream":false}'
```

A JSON completion with a `choices` array means nginx mTLS + Ollama are wired correctly and the
connector will work with the same certs.

---

> **Note — UI creation is no longer available.** The OpenAI connector (and the other LLM
> connectors) are deprecated in favor of Elasticsearch inference endpoints, and creating one
> from the UI is disabled: it's hidden from the "Create connector" flyout and shows a
> deprecation badge. See [Kibana#261591](https://github.com/elastic/kibana/pull/261591) (mark LLM
> connectors deprecated / hide from creation) and
> [Kibana#276237](https://github.com/elastic/kibana/pull/276237). Use the preconfigured route
> below to stand up a connector for testing.

## 3. Test as a preconfigured connector (kibana.yml)

Paste the base64 blobs from `connector-blobs.txt` as single-line plain scalars.

**Important:** the cert/key/CA data go under `secrets`, NOT `config`. Only `verificationMode`
lives in `config`. (A private key belongs in the encrypted secrets store.) Putting the data
fields in `config` fails at Test time with:
`error validating connector type config: Unrecognized keys: "certificateData", "privateKeyData", "caData"`.

```yaml
xpack.actions.preconfigured:
  ollama-pki-test:
    name: Ollama PKI (test)
    actionTypeId: .gen-ai
    config:
      apiProvider: 'Other'
      apiUrl: https://localhost/v1/chat/completions
      defaultModel: llama3.1:8b
      verificationMode: full
    secrets:
      apiKey: dummy_key
      certificateData: <base64 of client.crt>
      privateKeyData: <base64 of client.key>
      caData: <base64 of ca.crt>
```

- `apiKey` must be present and non-empty (the secrets schema expects it), but the value is
  never checked in this setup — `dummy_key` is fine. To keep it out of plaintext, use the
  keystore instead:
  `bin/kibana-keystore add xpack.actions.preconfigured.ollama-pki-test.secrets.apiKey`
- **Restart Kibana** after editing `kibana.yml` — preconfigured connectors are only read at
  boot. The connector then appears (non-editable) under Stack Management → Connectors; test it
  from the Test tab there.

---

## Gotchas we hit (in order)

1. **`nginx.conf` written with `proxy_pass ...\;`** (escaped semicolon from shell history)
   → nginx `[emerg] invalid number of arguments in "proxy_pass" directive`. Fix the exact
   line with sed so paste can't re-break it, and confirm the line number first:

   ```bash
   grep -n proxy_pass nginx.conf
   sed -i '' '<LINE>s|.*|      proxy_pass http://ollama:11434;|' nginx.conf   # macOS sed
   ```

   Validate before restarting: `docker compose run --rm nginx-proxy nginx -t`.

2. **Docker created an empty `nginx.conf` directory** because `docker compose up` ran before
   the file existed. `file nginx.conf` reveals it; `docker compose down && rm -rf nginx.conf`,
   recreate the file, then `up`.

3. **nginx container exits on boot** → `docker compose ps` shows only ollama. Always read
   `docker compose logs nginx-proxy` for the reason; it's virtually always a config error.

4. **macOS `cat` has no `-A`** → use `cat -vet` to reveal hidden characters
   (`M-BM-` = non-breaking space, `^M` = carriage return).

5. **Preconfigured PKI fields under `config`** → validation error at Test time. Move
   `certificateData` / `privateKeyData` / `caData` to `secrets` (see 3b).

6. **Cert / link expiry** → don't reuse the PR's old creds; regenerate (see top).

## Host-reachability notes

- Server cert CN must match the host Kibana connects to (`localhost` here).
- If Kibana runs from source on the host (`yarn start`), `localhost:443` reaches the published
  nginx port and this works as-is.
- If Kibana is itself in a container, `localhost` won't reach the nginx container — point
  `apiUrl` at the reachable service/hostname and regenerate `server.crt` with a matching CN.
- Ensure `localhost` isn't excluded by `xpack.actions.allowedHosts` (defaults to `["*"]`).
