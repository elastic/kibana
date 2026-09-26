# Connector catalog live fixtures

Signed catalog copy used by unit tests and local e2e. Layout matches design doc 6.1:

```
catalog.json
catalog.json.sig
connectors/abuseipdb/1.0.yaml
connectors/abuseipdb/1.1.yaml
connectors/abuseipdb/icons/sha256-<hash>.svg
connectors/okta/1.0.yaml
connectors/okta/icons/sha256-<hash>.svg
```

`catalog.json` uses `MAJOR.MINOR` versions, `sequence`, and `typeMetadata`. Contract YAML has no `metadata` block.

After editing a YAML or icon, regenerate hashes and the signature:

```
node sign_catalog.js
```

The signature is Ed25519 over the exact `catalog.json` bytes, verified with the PoC key in `../__fixtures__/dev_signing_key/`. Replace that key with the Elastic production key before the first release.

## e2e

1. Serve this folder on 8090:

   ```
   python3 -m http.server 8090
   ```

2. Run the AbuseIPDB mock on 8091 (`~/code/notes/caas/oob-connector-merge/17-e2e-artifacts/mock_abuseipdb.py`).

3. In `config/kibana.dev.yml`:

   ```
   xpack.actions.catalog.enabled: true
   xpack.actions.catalog.url: http://127.0.0.1:8090
   xpack.actions.catalog.refreshInterval: 10s
   ```

   Air-gapped:

   ```
   xpack.actions.catalog.localBundlePath: <absolute path to this folder>
   ```

4. To publish `1.2`, copy `connectors/abuseipdb/1.1.yaml` to `1.2.yaml`, bump `version`, add the row, then run `node sign_catalog.js`.
