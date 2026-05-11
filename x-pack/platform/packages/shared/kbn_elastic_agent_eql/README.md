# @kbn/elastic-agent-eql

Syntax validator for Elastic Agent's boolean EQL — the conditional-input expression language used by Fleet package policies (`condition` field at integration, input, and stream level).

See <https://www.elastic.co/docs/reference/fleet/dynamic-input-configuration#condition-syntax>.

> This is **not** Security's EQL (event query language). It is the boolean expression language defined in the Elastic Agent Go repo.

## Public API

```ts
import { validateEqlExpression, type EqlSyntaxError } from '@kbn/elastic-agent-eql';

const errors = validateEqlExpression("${host.platform} == 'linux'");
// → [] when valid, [{ line, column, message }, ...] when malformed

interface EqlSyntaxError {
  line: number;   // 1-based
  column: number; // 0-based (Monaco consumers add +1)
  message: string;
}
```

Empty or whitespace-only input returns `[]` — consistent with the agent treating an empty `condition` as "no condition".

## Grammar source

`src/antlr/Eql.g4` is vendored verbatim from the Elastic Agent repository:

- Upstream: <https://github.com/elastic/elastic-agent/blob/main/internal/pkg/eql/Eql.g4>
- Vendored from tag: **v9.4.0**
- Commit: `05a90892bc1f1ad2e4c265942b8632e7db8ff5bb`

When upstream changes, update `Eql.g4` in this package and re-run the regen command below. Bump the tag/commit reference above so future regens are reproducible.

## Regenerating the parser

The TypeScript lexer/parser/listener/visitor under `src/antlr/` are generated from `Eql.g4` by the ANTLR4 tool. They are committed so consumers don't need ANTLR installed.

**Prerequisites:**

- Java 11+
- ANTLR4 tool 4.13.2 (matches the `antlr4` npm runtime version in Kibana's root `package.json`)

Install the ANTLR tool on macOS via Homebrew:

```sh
brew install antlr
```

…or download the jar from <https://www.antlr.org/download.html> and alias `antlr` to a shell wrapper that invokes it.

Then from this package directory:

```sh
yarn build:antlr4
```

That regenerates `EqlLexer.ts`, `EqlParser.ts`, `EqlListener.ts`, `EqlVisitor.ts` under `src/antlr/`, and the postbuild step prepends `// @ts-nocheck` to each.

## Why the generated files carry `@ts-nocheck`

ANTLR4's TypeScript target emits code that doesn't strictly satisfy Kibana's stricter `tsconfig` rules. `@ts-nocheck` skips type checking on those files only — application code that uses the parser (in `src/validate.ts`) is fully type-checked.
