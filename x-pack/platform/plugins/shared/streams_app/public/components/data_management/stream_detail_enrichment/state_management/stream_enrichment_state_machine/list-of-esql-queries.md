### GROK basics (Linux)

- Simple GROK (no condition)
```esql
FROM logs.linux
| GROK body.text "%{IP:client_ip}"
```

- GROK with ECS WHERE to test Wired mapping (host.name → resource.attributes.host.name)
```esql
FROM logs.linux
| WHERE host.name == "host1"
| GROK body.text "%{IP:client_ip}"
```

- GROK with LIKE condition (contains)
```esql
FROM logs.linux
| WHERE message LIKE "%connection%"
| GROK body.text "%{IP:client_ip}"
```

- GROK with multiple WHEREs (combine AND)
```esql
FROM logs.linux
| WHERE host.name == "host1"
| WHERE message LIKE "%ftpd%"
| GROK body.text "%{IP:client_ip}"
```

- GROK then RENAME field (pipeline order matters)
```esql
FROM logs.linux
| GROK body.text "%{IP:client_ip}"
| RENAME client_ip AS ip_address
```

### DISSECT basics (Linux)

- DISSECT syslog-ish line (no condition)
```esql
FROM logs.linux
| DISSECT body.text "%{month} %{day} %{time} %{syslog_host} %{program}[%{pid}]: %{msg}"
```

- DISSECT with LIKE (startsWith)
```esql
FROM logs.linux
| WHERE message LIKE "Oct%"
| DISSECT body.text "%{month} %{rest}"
```

- DISSECT with IS NOT NULL guard
```esql
FROM logs.linux
| WHERE message IS NOT NULL
| DISSECT body.text "%{month} %{day} %{time} %{syslog_host} %{rest}"
```

### EVAL/RENAME mapping

- EVAL literal assignment + GROK
```esql
FROM logs.linux
| WHERE message LIKE "%ftpd%"
| EVAL service.name = "ftpd"
| GROK body.text "%{IP:client_ip}"
```

- EVAL copy (simple assignment)
```esql
FROM logs.linux
| EVAL line = message
| DISSECT line "%{month} %{rest}"
```

### Windows examples (Wired mapping focus)

- GROK with ECS WHERE (service.name/host.name map to resource.attributes.*)
```esql
FROM logs.windows
| WHERE host.name == "host-104"
| GROK body.text "%{TIMESTAMP_ISO8601:ts}, %{WORD:level}%{SPACE}%{DATA:rest}"
```

- DISSECT CBS line (no condition)
```esql
FROM logs.windows
| DISSECT body.text "%{ts}, %{level} %{+level} %{+level} %{+level} %{rest}"
```

### Boolean logic and IN

- AND + NOT
```esql
FROM logs.linux
| WHERE host.name == "host1" AND NOT (message LIKE "%failure%")
| GROK body.text "%{IP:client_ip}"
```

- IN list
```esql
FROM logs.linux
| WHERE host.name IN ("host1", "host2")
| GROK body.text "%{IP:client_ip}"
```

### Mixed field name cases

- WHERE on ECS message field with GROK on body.text
```esql
FROM logs.linux
| WHERE message LIKE "%connection%"
| GROK body.text "%{IP:client_ip}"
```

- WHERE on ECS service.name for Windows (maps to resource.attributes.service.name)
```esql
FROM logs.windows
| WHERE service.name == "CBS"
| GROK body.text "%{TIMESTAMP_ISO8601:ts}, %{WORD:level}%{SPACE}%{DATA:rest}"
```

---

Notes
- Use these in Discover (ES|QL mode) with a single stream target (`FROM logs.linux` or `FROM logs.windows`).
- After clicking “Materialize in Streams”, GROK/DISSECT should be prepopulated, and WHERE should appear as the processor condition (Advanced settings). On Wired streams, ECS fields in WHERE are mapped to OTel (e.g., `host.name` → `resource.attributes.host.name`).

