# osquery

This plugin adds extended support to Security Solution Fleet Osquery integration

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

---

## Files tab (file-system viewer)

The **Files** tab is an in-Kibana host file-system viewer for incident response. It is behind the `fileSystemViewer` experimental flag (default **off**); enable it with:

```yaml
xpack.osquery.enableExperimental: ['fileSystemViewer']
```

It pairs the Osquery `file` table (read-only, cross-platform directory listing) with Elastic Defend response actions (`get-file`, `run_script`) for the act-on-file verbs. Browse works on any host with the Osquery integration; act-verbs light up only on Endpoint-capable hosts (Enterprise license + the relevant privilege).

### Platform limitations (by design — document these to users)

- **macOS Full Disk Access (TCC).** osqueryd runs under a launch daemon that, without **Full Disk Access (FDA)**, cannot read TCC-protected user locations (`~/Library`, `~/Documents`, `~/Desktop`, Mail, Messages, etc.). Those directories return **zero rows**, which is indistinguishable from a genuinely empty directory — the viewer flags likely-denied protected paths rather than showing a bare empty folder, but the real fix is granting FDA.
  - Grant interactively: **System Settings → Privacy & Security → Full Disk Access** → add the Elastic Agent / osqueryd binary.
  - Grant at scale via **MDM PPPC** (Privacy Preferences Policy Control) profile: deploy a configuration profile granting `SystemPolicyAllFiles` to the agent's code-signing identity / binary path, so protected directories are readable without per-machine clicks.

- **Windows per-session mapped drives.** The agent runs as **SYSTEM**, which does not see drive letters mapped in an interactive user's logon session (e.g. a user's `Z:` network share). `logical_drives` reports only the volumes visible to the SYSTEM session, so user-mapped network drives will not appear as tree roots. Browse what the SYSTEM session can see; mapped-drive / network-share browsing beyond that is out of scope.

- **10,000-row result-window ceiling.** A single directory listing is capped at the Osquery results window (`DEFAULT_MAX_TABLE_QUERY_SIZE`, 10,000 entries). Larger directories are flagged as **truncated** in the UI with a pointer to Discover for full access.

### Security notes

- Every user-supplied path is escaped via `escapeOsqueryStringLiteral` before being interpolated into live-query SQL; the Files tab never raw-concatenates paths into queries.
- Each directory browse emits an ECS audit event (`osquery_file_browse`); each file act-verb emits `osquery_file_retrieve` (user / host / path / action / time), in addition to the durable record written by the Endpoint actions index.
