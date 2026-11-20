# SSH Host — threat status

Source: [elastic/infosec#30627](https://github.com/elastic/infosec/issues/30627), against [kibana#283740](https://github.com/elastic/kibana/pull/283740).

In scope is the SSH connector, its form, its schema, and the `ssh.*` steps. Out of scope is shared platform code: the Actions framework (`create`, `update`, the connector audit event, the sub-action executor, the public execute route) and the workflow execution engine (what a run stores and who can read it).

## Already in the branch

- The connector uses in-process `ssh2`. No `sshpass`, no temporary private-key file.
- Skip host-key verification defaults to off and the form says it is insecure.
- Password and private key are connector secrets. The hostname is checked against `xpack.actions.allowedHosts` before connect.
- A client failure is returned as code 255 with the messages `ssh.run` already treats as permanent.

## Status

| Threat | Status | Reason |
|---|---|---|
| TH01 pin the server public key, delete trust-on-first-use | ✅ Built | `hostVerifier` compares the pinned blob before login. Trust-on-first-use is gone. |
| TH01 password only with a pin | ✅ Built | Rejected in the connector before `client.connect` when skip is on or the pin is missing. |
| TH01 disable keyboard-interactive | ✅ Built | The connector no longer sets `tryKeyboard` or answers prompts. |
| TH01 show pinned vs skipped on the form | ✅ Built | Callout on the connector form, including read-only. |
| TH01 modern algorithms, legacy behind `xpack.stack_connectors.sshHost.allowLegacyAlgorithms` | ✅ Built | Default ssh2 lists drop `ssh-rsa`, `ssh-dss`, SHA-1 MACs, and SHA-1 key exchange. The flag restores ssh2's own defaults. ssh2 1.17 still cannot turn off its SHA-1 client-signature fallback. |
| TH01 audit who enabled skip, and which mode | Out of scope | The create and update audit event is written in Actions for every connector. It records the user and the connector id. It has no field for which setting changed. Adding the mode means changing `create.ts`, `update.ts`, and `connectorAuditEvent`. |
| TH02 block direct execute outside Workflows | Out of scope | `supportedFeatureIds` filters listings. The public execute route does not read it. Enforcing workflows-only is an Actions authorization change. |
| TH02 remove Agent Builder from this connector | In scope, needs a product call | `supportedFeatureIds` is set on the SSH connector type. Dropping `agentBuilder` is connector registration, not the agent runner. |
| TH02 per-call confirmation for the generic agent tool | Out of scope | That tool's confirmation policy defaults to `never` in Agent Builder. |
| TH03 document fixed commands, env for dynamic values, upload replaces a file, output is untrusted | In scope | Step docs and examples. |
| TH03 require an absolute path | In scope | Connector and step schemas. Today a path only has to be non-empty and at most 4096 characters. |
| TH03 stop the engine from templating untrusted text into `command` | Out of scope | Templating is the workflow engine. The connector receives the rendered script. |
| TH04 hide command, logs, and downloaded contents by default | Out of scope | The engine stores rendered step input and results, and the step read API returns them, for every step type. |
| TH05 document `allowedHosts` plus egress | In scope | Docs. `allowedHosts` already runs. It matches the hostname string, not the resolved address or the port. |
| TH05 make `allowedHosts` check the resolved IP | Out of scope | That comparison lives in Actions config. |
| TH06 keep an `error` listener for the life of the client, deadlines, caps | In scope | All of this is `ssh_host_session.ts`. A second `error` before `ready` is unhandled today. SFTP has no deadline. |
| TH07 same account and verified server identity on poll and cancel; unknown outcome when that check fails; confirm the kill; reconcile a lost launch; bound remote logs | In scope | `remote_host_job.ts` and the `ssh.run` step. |
| TH07 cancel an in-flight connect, exec, or transfer | Out of scope | The sub-action executor calls the SSH method with the params only. It does not take the workflow abort signal. |
| TH08 audit principal, connector, destination, operation, outcome, tied to the run | Out of scope | Execution audit is emitted by the Actions executor for every connector. It does not carry the SSH destination or the remote outcome. |
| Passphrase-protected keys, key strength, post-quantum key exchange, upload overwrite opt-in | Not in this build | Infosec marked these as follow-ons. Reply on the issue with a ticket or an accepted risk. |

## Build

TH01 is built except the audit event. Next, still outside Actions: TH06, the TH07 step behavior, and the TH03 and TH05 docs.

The TH01 audit gap stays open: a connector save still records who saved it and which connector, and does not record that host-key verification was skipped.
