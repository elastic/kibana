/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Built-in skill that provides guidance for executing bash commands
 * in a virtual sandboxed environment using just-bash.
 */
export const bashExecutionSkill = defineSkillType({
  id: 'bash-execution',
  name: 'bash-execution',
  basePath: 'skills/platform',
  description:
    'Guides agents on using the virtual bash sandbox to execute commands, process data, write scripts, and run Python code.',
  getRegistryTools: () => [platformCoreTools.executeBash],
  content: `# Bash Execution Guide

## Overview

You have access to a **virtual bash sandbox** (powered by just-bash) that runs entirely in-memory.
Use it to execute shell commands, process data, write scripts, and run code — all without affecting the real filesystem.

## When to Use Bash vs. Other Tools

| Task | Recommended Tool |
|------|-----------------|
| Query Elasticsearch data | Use \`search\` or \`execute_esql\` tools |
| Transform/reshape data you already have | **Use bash** (jq, awk, sed, etc.) |
| Parse JSON, CSV, YAML, or XML | **Use bash** (jq, yq, xan) |
| Run complex logic or algorithms | **Use bash** (python3) |
| Process text (filter, sort, count, deduplicate) | **Use bash** (grep, sort, uniq, wc) |
| Create or explore indices | Use \`list_indices\` or \`get_index_mapping\` |

**General rule:** Use Elasticsearch tools to *fetch* data, then use bash to *transform* it.

## Available Capabilities

### Core Bash Commands
Standard Unix commands: \`cat\`, \`grep\`, \`awk\`, \`sed\`, \`sort\`, \`uniq\`, \`wc\`, \`head\`, \`tail\`, \`cut\`, \`tr\`, \`find\`, \`xargs\`, \`tee\`, \`diff\`, and many more.

### Data Processing
- **JSON**: \`jq\` for querying and transforming JSON
- **YAML/XML/TOML**: \`yq\` for multi-format data processing
- **CSV**: \`xan\` for CSV processing

### Python
Use \`python3\` to run Python scripts:
\`\`\`bash
python3 -c "import json; data = json.loads(open('/data/input.json').read()); print(len(data))"
\`\`\`

## How to Use the Tool

The \`execute_bash\` tool accepts:
- **script** (required): The bash command or script to execute
- **files** (optional): A map of file paths to content, pre-populated before execution

### Providing Input Data
Pass data through the \`files\` parameter:
\`\`\`json
{
  "script": "cat /data/users.json | jq '.[] | select(.age > 30) | .name'",
  "files": {
    "/data/users.json": "[{\\"name\\":\\"Alice\\",\\"age\\":35},{\\"name\\":\\"Bob\\",\\"age\\":25}]"
  }
}
\`\`\`

### Stateless Execution
Each invocation starts with a fresh environment. If you need data from a previous step,
pass it again via the \`files\` parameter.

## Best Practices

1. **Prefer pipelines**: Chain commands with \`|\` for efficient data processing
2. **Use jq for JSON**: It is faster and more readable than manual parsing
3. **Pass data via files**: Use the \`files\` parameter instead of embedding large data in the script
4. **Check exit codes**: Non-zero exit codes indicate errors — check stderr for details
5. **Keep scripts focused**: One logical operation per invocation for clarity`,
});
