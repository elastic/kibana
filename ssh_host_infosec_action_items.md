# SSH Host — action items for infosec#30627

Source: [elastic/infosec#30627](https://github.com/elastic/infosec/issues/30627), reviewed against [kibana#283740](https://github.com/elastic/kibana/pull/283740) at `630f08d`.

Infosec asked for a ticket on every mitigation the team will do, and an explicit risk acceptance on every mitigation the team will not do. This list is that reply. Q1 is already met: the connector uses in-process `ssh2@1.17.0`, with no `sshpass` and no temporary private-key file.

## Decisions to record on the issue

These are product calls. Each one needs an owner and a sentence on the issue before the matching ticket is opened.

1. **Host-key exceptions.** Default is a host key pinned on the connector. Decide who may turn on trust-on-first-use or skip verification: the connector editor, or a deployment operator who first enables the exception in `kibana.yml`.
2. **Direct execute API.** Decide whether `.ssh` may be executed through the public Actions execute API. Workflow-only means a server-side block and a test. Supported means the docs say so.
3. **Agent Builder.** Decide whether an attached agent may run arbitrary shell and file transfer, including when no user is present. Keeping it means limits defined before the run. Removing it means dropping `AgentBuilderConnectorFeatureId` and a test that the generic connector tool rejects `.ssh`.
4. **Execution payloads.** Decide the default readers see: run status and selected non-sensitive metadata. Raw command, env, stdout, stderr, and downloaded file contents are an explicit opt-in under an enforced access policy. Separately, decide what the engine must keep so a later step or a resumed run still works, and publish who can read that copy. [infosec#30175](https://github.com/elastic/infosec/issues/30175) does not settle SSH payload access.
5. **Audit shape.** Decide whether to extend the existing Actions execution event or emit a dedicated event. The record must carry principal, connector, destination, operation, and outcome, correlated to the workflow run or request id. Credentials stay out. Decide whether remote paths are included. For `ssh.run`, the Actions call succeeding and the remote job’s final outcome are separate facts.
6. **FIPS.** Confirm with the FIPS owners whether the connector is supported in FIPS-mode Kibana. Supported means the negotiated crypto is validated on the shipped runtime. Unsupported means the connector is withheld in that mode.
7. **Managed deployments.** Before `.ssh` is offered on Cloud or serverless, verify which projects can execute it and which destinations the Kibana process can actually reach. `xpack.actions.allowedHosts` filters the hostname string only and defaults to `*`.

## Build before tech preview

### TH01 — endpoint identity

- Add a required host-key field on the connector. Verify the key the server presents against that pin before user authentication, and before any command or file transfer, on every session. A mismatch closes the session.
- Remove per-process trust-on-first-use as the default. The current record under the OS temp directory is empty on every new process and every other node (`acceptNewHostKey` in `ssh_host_session.ts`).
- Allow password authentication only when a host key is pinned.
- Stop answering keyboard-interactive prompts. `connectConfig` sets `tryKeyboard: true` and the `keyboard-interactive` handler replies to every prompt with the stored password.
- Keep skip-verification off by default. Show the active mode when the connector is saved and when it is used. Audit who enabled an exception and which mode they chose. The generic connector update event does not record which settings changed.
- Set modern default algorithms for server and client authentication. Legacy algorithms, including `ssh-rsa` and `hmac-sha1`, are an operator opt-in.

### TH06 — Kibana availability

- Keep a client `error` listener for the life of the connection. `openClient` uses `client.once('error')` and removes it on `ready`, so a second `error` before `ready` is unhandled and can crash the process.
- Put a deadline on the whole operation, including SFTP. The exec timeout starts only after the server accepts the request. Upload and download have no deadline.
- Cap pooled sessions, in-flight operations, and total buffered bytes per connector. Exec currently buffers up to 100 MiB per stream, and uploads hold the base64 payload and the decoded copy.

### TH07 — remote job lifecycle

- Forward the workflow abort signal into connect, exec, and transfer. The sub-action executor calls the SSH method without the signal.
- On poll and cancel, require the same SSH account and the same verified server identity as the launch. If the connector was deleted, the credential was revoked, or the destination changed, report the outcome as unknown.
- With skip-verification there is no verified server identity to compare. Report the job outcome as unknown. Do not treat skip as a waiver of that check.
- Report the job as terminated only after the kill is confirmed. The kill script uses `|| true`, and the poll-limit message can say the command was terminated after cleanup failed.
- Reconcile an uncertain launch before retry. `startJob` allocates a new job id on every call, and the remote command can start before Kibana records success.
- Bound remote job runtime and the growth of the remote stdout and stderr files. A Kibana request deadline only bounds how long Kibana waits. The 2-day directory sweep runs only when another job is prepared.

### TH08 — attribution

- Emit the audit record from decision 5 on every exec, upload, and download: principal, connector, destination, operation, outcome, correlation id. No password, no private key.
- For `ssh.run`, record the remote job’s final outcome separately from the Actions call result.

### TH04 — payload disclosure

- Default the execution UI and the step read API to status plus the non-sensitive metadata chosen in decision 4.
- Gate raw step input, command output, and downloaded contents behind the explicit opt-in and its access check.
- Document retention: what is stored, for how long, and which privilege reads it. A smaller download cap still stores a small secret.

### TH05 — network reach

- Document that self-managed operators set `xpack.actions.allowedHosts` and egress rules for the destinations they intend. Hostname allowlisting does not constrain the resolved IP or the port.
- Complete the managed-deployment check in decision 7 before enabling `.ssh` there. Logs Essentials already omits `.ssh` from `xpack.actions.enabledActionTypes`. The other checked serverless configs leave that setting unset.

### TH02 — who can exercise the account

- Implement decision 2. A block is server-side, with a test that a direct execute call is rejected. Support is a documented contract, with a test that states it.
- Implement decision 3. Removal includes a test that the generic Agent Builder connector tool rejects `.ssh`.
- Document that execute privilege on the connector is the authority of the saved SSH account, and that the account should be dedicated and least-privileged.

### TH03 — untrusted input

- Lead the step docs and examples with a fixed command, a fixed connector id, and absolute paths. Dynamic values go in through fixed `env` names. The script validates each value.
- State in the docs that templating untrusted input into `command` runs as the SSH user, that a rendered `connector-id` can select another SSH connector the run principal may already execute, and that upload replaces an existing file.
- State that stdout, stderr, and downloaded contents are untrusted. Kibana shows them as JSON text. A downstream step, app, or model has to render them safely and validate them before they drive a sensitive action.

## Ticket, or accept in writing

Infosec marked these as follow-ons. Ship them, or reply on the issue with the accepted risk.

| Item | Threat | If declined, the accepted risk |
|---|---|---|
| Passphrase-protected client keys, and a check on key strength | TH01 | An unencrypted key sits in the encrypted saved object and in process memory. Strength is not validated. |
| Post-quantum key exchange, if a target deployment requires it | TH01 | Confirm with the deployment owner. No evidence was collected. |
| Explicit overwrite opt-in on `uploadFile` | TH03 | Upload replaces an existing file with no extra confirmation. Docs from TH03 still required. |
| Per-call confirmation for interactive Agent Builder use | TH02 | Only relevant if decision 3 keeps agents. The generic tool’s confirmation policy defaults to `never`. |

## Reply to post on infosec#30627

One comment, after the decisions above are made:

- Q1 is met (`ssh2`).
- Q2: password auth only with a pinned host key, keyboard-interactive disabled. Ticket link.
- Q3: pin by default. Ticket link. Any remaining trust-on-first-use is the exception from decision 1.
- Q4: skip stays off by default, and the exception is visible and audited. Ticket link, plus who may enable it.
- Q5: the Agent Builder decision and its ticket or removal.
- Q6: the execution-payload default and its ticket.
- Q7: the audit shape and its ticket.
- Q8: `allowedHosts` plus egress, and the managed-deployment check before enablement.
- For each row in the table above: a ticket link, or a sentence that accepts the risk.
