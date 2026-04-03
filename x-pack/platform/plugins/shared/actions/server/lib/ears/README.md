# Elastic Authentication Redirect Service (EARS)

EARS is an OAuth 2.0 proxy operated by Elastic. It owns the OAuth app credentials (client ID and secret) for each supported provider, so connector users never need to register their own OAuth app. 
Kibana talks to EARS instead of talking directly to the OAuth provider.

Supported providers (defined as `EARS_PROVIDERS` in `@kbn/connector-specs`): 
* Google
* Microsoft
* Slack

For more details on EARS, see the [source code](https://github.com/elastic/elastic-auth-redirect-service) & [internal documentation](https://docs.elastic.dev/search-team/teams/extract-and-transform/ears).

Key differences from a standard OAuth authorization code grant flow:

| Standard OAuth                                                      | EARS                                                  |
|---------------------------------------------------------------------|-------------------------------------------------------|
| Kibana sends `client_id` + `client_secret` to the token endpoint    | No client credentials — EARS already knows them       |
| Token endpoint accepts form-encoded `grant_type=authorization_code` | Token endpoint accepts JSON `{ code, pkce_verifier }` |
| Refresh endpoint accepts `grant_type=refresh_token`                 | Refresh endpoint accepts JSON `{ refresh_token }`     |
| `redirect_uri` required in token exchange                           | No `redirect_uri` in token exchange                   |

---

## Endpoint structure

All EARS endpoints are derived from the configured `earsBaseUrl`
(`xpack.actions.ears.url` in `kibana.yml`) and the provider name:

| Purpose        | Path                                          |
|----------------|-----------------------------------------------|
| Authorize      | `{earsBaseUrl}/v1/{provider}/oauth/authorize` |
| Token exchange | `{earsBaseUrl}/v1/{provider}/oauth/token`     |
| Token refresh  | `{earsBaseUrl}/v1/{provider}/oauth/refresh`   |

`getEarsEndpointsForProvider(provider)` in `url.ts` builds the path segments;
`resolveEarsUrl(path, earsBaseUrl)` assembles the full URL.

---

## Files

| File                            | Purpose                                                                           |
|---------------------------------|-----------------------------------------------------------------------------------|
| `url.ts`                        | Utilities for URL construction (`resolveEarsUrl`, `getEarsEndpointsForProvider`)  |
| `request_ears_token.ts`         | Exchanges an authorization code for tokens (called from `/_oauth_callback`)       |
| `request_ears_refresh_token.ts` | Refreshes an expired access token using the stored refresh token                  |
| `get_ears_access_token.ts`      | Entry point for connector execution: reads the stored token, refreshing if needed |
| `index.ts`                      | Public exports for this module                                                    |

---

## Token storage

Tokens are stored as `user_connector_token` saved objects, keyed by `(connectorId, profileUid, tokenType)`. 
This is the `per-user` auth mode, where each Kibana user has their own independent token for each connector.

During execution, `getEarsAccessToken` will:

1. Acquire a per-connectorId lock to prevent concurrent refreshes for the same connector.
2. Re-read the token inside the lock (another in-flight request may have refreshed it already).
3. Return the stored token if still valid.
4. Call `requestEarsRefreshToken` if expired, which calls the `refresh` endpoint from EARS, then persists the new token.

## Configuration

```yaml
# kibana.yml
xpack.actions.ears.url: https://...
```

`configurationUtilities.getEarsUrl()` exposes this value at runtime.
If `ears.url` is not set, `resolveEarsUrl` throws, and the connector will fail with a clear error rather than silently misconfiguring the URL.