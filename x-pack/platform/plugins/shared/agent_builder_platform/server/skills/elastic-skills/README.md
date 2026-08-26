# Elastic skills

This directory is the landing zone for the universal skills maintained in
🔒 [`elastic/agent-skills-sandbox`](https://github.com/elastic/agent-skills-sandbox) so they can be loaded by Agent
Builder.

## Do not edit these files by hand

Everything in this directory except this `README.md` is generated. Each subdirectory is one skill: a
`SKILL.md` plus its referenced files, copied from the source repository with the Agent Builder
environment preamble rendered in.

To change one of these skills, edit it in `agent-skills-sandbox` and let the sync update its Kibana
pull request. Edits made here are overwritten on the next sync.

## How skills get here

A skill in `agent-skills-sandbox` opts in with a `sync.kibana` directive in its `SKILL.md`
frontmatter:

```yaml
---
name: elasticsearch-esql
description: Execute ES|QL queries against Elasticsearch.
sync:
  kibana: true
---
```

On a merge to `main` in that repository, its `Sync to Kibana` workflow force-pushes the
`automation/agent-skills-sync` branch here and opens or updates a single pull request. The PR body
links the source commit.

Each skill's directory name is its Agent Builder skill ID, taken from the frontmatter `name`. The
destination is not configurable upstream, precisely so the two cannot disagree.
`elastic_skills.test.ts` asserts it, and runs the real skill loader over every directory here.

The sync owns this directory outright. Deleting a skill upstream, or removing its `sync.kibana`
directive, deletes its directory here on the next sync, and renaming a skill shows up as one
directory added and the old one removed. Any directory added here by hand is removed the same way.

## How skills get registered

`../elastic_skills.ts` scans this directory, loading each subdirectory through
`@kbn/agent-builder-skill-loader`. `../register_skills.ts` registers the result during this plugin's
setup, alongside the skills this plugin defines in code, under the `skills/elastic-skills` base path.
Adding a skill here is all the registration it needs. A skill the loader rejects is logged and
skipped so it cannot stop the others from registering.

Note that Kibana's distribution build strips files by name (`README.md`, `test.md`) and by parent
directory (`docs/`, `tests/`), so a reference with one of those names loads from a development
checkout but is absent from a released build. The sync warns about these in its pull request.

If a generated pull request carries the `agent-builder:skill-sync-overwrite` label, the sync
replaced a skill that already existed at that path. Review the flagged path before merging.

Skills that call the Elastic Cloud control plane (the `cloud:` or `fleet:` HTTP API prefixes) are
never synced here: Agent Builder is bound to a single stack deployment and has no organization-level
control-plane access.

See the source repository's sync documentation for details:
<https://github.com/elastic/agent-skills-sandbox/blob/main/docs/kibana-sync.md>.
