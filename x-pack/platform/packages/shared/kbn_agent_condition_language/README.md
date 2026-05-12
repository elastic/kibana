# @kbn/agent-condition-language

Syntax validator for **Elastic Agent's condition expression language** which is evaluated by the Elastic Agent to conditionally include agent inputs and streams.

See <https://www.elastic.co/docs/reference/fleet/dynamic-input-configuration#condition-syntax>.

## Public API

```ts
import {
  validateAgentConditionExpression,
  type AgentConditionSyntaxError,
} from '@kbn/agent-condition-language';

const errors = validateAgentConditionExpression("${host.platform} == 'linux'");
// → [] when valid, [{ line, column, message }, ...] when malformed

interface AgentConditionSyntaxError {
  line: number; // 1-based
  column: number; // 0-based (Monaco consumers add +1)
  message: string;
}
```

Empty or whitespace-only input returns `[]` — consistent with the agent treating an absent `condition` as "no condition".

## Grammar source

The build script fetches the antlr4 grammar file `Eql.g4` from `elastic/elastic-agent`, and generates the TypeScript parser in `src/antlr/`.

Pinned upstream:

- Repo: <https://github.com/elastic/elastic-agent>
- Path: `internal/pkg/eql/Eql.g4`
- Tag: **v9.4.0** (override with `AGENT_EQL_GRAMMAR_TAG` env var or by editing the constant at the top of `scripts/build_parser.js`)

## Regenerating the parser

```sh
yarn build:antlr4
```

This runs `scripts/build_parser.js`, which:

1. Fetches the upstream `Eql.g4` at the pinned tag.
2. Spawns the ANTLR4 tool to generate the TypeScript lexer/parser/listener/visitor.
3. Renames the PascalCase output to snake_case (`EqlLexer.ts → eql_lexer.ts`, etc.) and rewrites the sibling imports inside each file.
4. Prepends the Elastic License 2.0 header and `// @ts-nocheck` to each generated `.ts`.
5. Deletes the temporary `Eql.g4`.

**Prerequisites:**

- Java 11+.
- ANTLR4 tool **4.13.2** (matches the `antlr4` npm runtime version in Kibana's root `package.json`).

Install the ANTLR tool on macOS:

```sh
brew install antlr
```

…or download the jar from <https://www.antlr.org/download.html> and alias `antlr` to a shell wrapper that invokes it.

## Why the generated files carry `@ts-nocheck`

ANTLR4's TypeScript target emits code that doesn't strictly satisfy Kibana's stricter `tsconfig` rules. `@ts-nocheck` skips type checking on those files only — application code that uses the parser (in `src/validate.ts`) is fully type-checked.

The `src/antlr/` directory is also added to `.eslintignore` so generated files aren't linted.
