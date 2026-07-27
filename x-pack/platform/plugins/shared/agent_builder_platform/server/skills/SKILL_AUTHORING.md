# Writing skill content

Skills inject markdown into the agent's context window when loaded. Every line competes for
attention and costs tokens — keep content short, concrete, and action-oriented.

## When to load

Start with a clear trigger condition. The agent uses this to decide whether to self-load the
skill. Be specific: name the task, not a topic. Vague triggers ("when working with data") cause the agent to either load the skill
unnecessarily or miss it when it should load.

## Scope boundaries

State what the skill does NOT cover, especially if adjacent skills exist. This prevents the
agent from using the wrong skill and helps it route correctly when multiple skills are
available.

## Templates over prose

Give the agent copy-paste patterns it can execute directly. A query template with placeholder
values is more useful than a paragraph explaining how queries work. If there is a recommended
default, show it first and label it as such.

## One recommended path

Avoid presenting choices without a recommendation. Pick the best default and show it. Label
alternatives as fallbacks with explicit conditions for when they apply.

## Match query templates to your data model

By default, AI indices ships with `title`, `content`, and `description` as full-text fields,
each with a `semantic_text` sub-field (`title.semantic`, `content.semantic`,
`description.semantic`), plus `type` and `tags` as keyword facets and `attributes` as a
flattened keyword-queryable map. The `ki-retrieval` skill Elastic ships in Agent Builder is built around these defaults: it
uses hybrid FORK+FUSE search over `content`, `title`, and `description` (keyword branch) and their `.semantic` sub-fields (semantic branch), and shows filter examples
using `type` and `tags`.

If you are working with the default mappings, the `ki-retrieval` templates apply as-is. If
you have changed the mappings — different field names, no semantic sub-fields, additional
structured attributes — update the templates accordingly and say so explicitly in the skill.
Agents follow the templates literally; a reference to a field that doesn't exist fails every
time.

A few specific cases to consider:

- **No semantic sub-fields** — drop the semantic branch and use keyword-only search. A hybrid
  template against a non-semantic index wastes a branch and degrades results.
- **Custom `attributes`** — if you have added structured keyword fields that agents should
  filter on (account tier, region, product line), include filter examples for them. Agents
  cannot discover filterable fields from a retrieval template alone.
- **Additional text fields** — if you have fields beyond `content` and `title` that carry
  meaningful signal, include them in the keyword branch.

## Sequential flows

If steps must happen in order, number them. Agents parallelize by default; an ordered list
signals that sequencing matters.

## Schema and field reference

Include anything structural the agent needs: field names, types, index patterns, sub-field
notation. Agents cannot infer mappings — they need to be told.

## Keep it terse

Skill content is loaded into the context window on every invocation. Explanatory prose that
restates what good naming already conveys just dilutes the signal. If a line does not change
what the agent does, cut it.
