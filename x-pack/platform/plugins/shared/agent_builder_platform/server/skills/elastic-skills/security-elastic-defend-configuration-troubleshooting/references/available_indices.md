# Available indices

The data streams this skill searches for host evidence. Query only these patterns, with the search operations in the
skill's Operations table, and only for the target endpoint.

| Index pattern                            | Content                                                                                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logs-endpoint.events.file-*`            | Elastic Defend file event activity                                                                                                                                                                    |
| `logs-endpoint.events.network-*`         | Elastic Defend network event activity                                                                                                                                                                 |
| `logs-endpoint.events.process-*`         | Elastic Defend process event activity                                                                                                                                                                 |
| `logs-endpoint.events.library-*`         | Elastic Defend library event activity                                                                                                                                                                 |
| `logs-endpoint.events.registry-*`        | Elastic Defend registry event activity                                                                                                                                                                |
| `logs-endpoint.events.security-*`        | Elastic Defend security event activity                                                                                                                                                                |
| `logs-endpoint.events.device-*`          | Elastic Defend device event activity                                                                                                                                                                  |
| `logs-endpoint.events.api-*`             | Elastic Defend api event activity                                                                                                                                                                     |
| `logs-elastic_agent.endpoint_security-*` | Elastic Defend integration logs: output and event-shipping errors such as Logstash/SSL connectivity and Kafka delivery failures                                                                       |
| `logs-endpoint.alerts-*`                 | Elastic Defend alerts                                                                                                                                                                                 |
| `metrics-endpoint.metrics-*`             | Elastic Defend metrics                                                                                                                                                                                |
| `metrics-endpoint.policy-*`              | Elastic Defend policy response documents, including success, warning, and failure actions; action status and diagnostic context must be used to determine whether a policy response needs remediation |
| `.logs-endpoint.actions-*`               | Elastic Defend actions                                                                                                                                                                                |
| `.logs-endpoint.action.responses-*`      | Elastic Defend action responses                                                                                                                                                                       |

Fleet agent and endpoint metadata indices (`.fleet-agents*`, `metrics-endpoint.metadata-*`,
`metrics-endpoint.metadata_current_*`, `.metrics-endpoint.metadata_united_*`) are deliberately not listed: the diagnose
workflow returns host, agent and metadata state, so do not search them for it.
