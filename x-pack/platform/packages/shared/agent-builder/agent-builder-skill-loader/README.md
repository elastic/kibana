# @kbn/agent-builder-skill-loader

Reads a skill from a directory of markdown files and produces a validated Agent Builder `SkillDefinition`.

```ts
const skill = loadSkillFromDirectory(absoluteDir, 'skills/platform/agent-builder', { logger });
```

## Directory layout

`SKILL.md` is required at the top level. Every other `.md` file becomes referenced content, with its `relativePath` derived from where it sits in the tree:

```
my-skill/
  SKILL.md                            # required: frontmatter + skill body
  references/setup.md                 # reference at "./references"
  references/keyword-search/usage.md  # reference at "./references/keyword-search"
  scripts/run.py                      # ignored: not a .md file
  .github/CODEOWNERS.md               # ignored: dot-prefixed
```

Filenames (without the extension) and directory segments must contain only lowercase letters, numbers, hyphens, and underscores, and must start and end with a letter or number.

Non-markdown and dot-prefixed files and directories are ignored. Markdown files with unsupported filenames (e.g. `README.md`, a `Setup Guide.md`, `config.yaml.md`, `overview.MD`) throw an error.
## Frontmatter

`SKILL.md` must begin with a YAML frontmatter block. Unknown keys are ignored, so a skill authored for another harness may carry extra fields.

| Field | Required | Description |
| --- | --- | --- |
| `name` | Yes | Skill name. Lowercase letters, numbers, hyphens, underscores. Max 64 characters. |
| `description` | Yes | What the skill does and when to use it. Max 1024 characters. |
| `id` | No | Stable unique identifier. Defaults to `name`. Must additionally start and end with a letter or number. |
| `experimental` | No | When `true`, the skill is only available with experimental features enabled. |

## Errors

Every failure throws a `SkillLoadError` carrying a `code`, so callers can branch on the failure mode.

```ts
try {
  loadSkillFromDirectory(absoluteDir, basePath, { logger });
} catch (error) {
  if (error instanceof SkillLoadError && error.code === 'missing_skill_file') {
    // the directory is not a skill
  }
  throw error;
}
```

See `SkillLoadErrorCode` for the full set.

