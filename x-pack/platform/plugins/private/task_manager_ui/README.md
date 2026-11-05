# Task Manager UI

A Stack Management page (Cluster performance → Kibana background tasks) for inspecting Kibana Task Manager tasks run by all Kibana instances: task counts and overdue work per task type, recent run outcomes from the event log, and a per-task explanation of why a task is or is not running.

The page reads from the internal, read-only `/internal/task_manager/ui/*` routes owned by the `taskManager` plugin, which require the Global All privilege (`manage_taskManager`).
