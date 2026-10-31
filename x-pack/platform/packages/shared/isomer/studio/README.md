# Kibana Isomer Studio

One Studio for every production primitive pack available on `main`. The shared
config currently registers `@kbn/isomer-components`, the only landed pack, through
its public entry point. New packs must first be consumable by production Isomer
hosts, then register here; Studio is not an alternative production registry.

Studio is pinned to `@elastic/isomer-studio@0.4.0`, fetched by `npx` as development
and review tooling. It is not a Kibana plugin or production dependency. Its SDK,
runtime, React, and primitive sources come from this checkout. Existing Borealis
styling is retained through `createKibanaIsomerRuntime` and a shadow-root
`createIsomerStyleContext`.

## Local development

Use the Node version in `.nvmrc` and bootstrap the checkout first:

```sh
node scripts/kbn bootstrap
node x-pack/platform/packages/shared/isomer/studio/run.ts dev
```

Open the loopback URL printed by Studio (normally `http://127.0.0.1:5179`).
`dev --port 5180` selects another port. No Elasticsearch or Kibana server is
needed. Stop the process with Ctrl+C.

## Build and check

From the repository root:

```sh
node x-pack/platform/packages/shared/isomer/studio/run.ts check
node x-pack/platform/packages/shared/isomer/studio/run.ts build
python3 -m http.server 5180 --bind 127.0.0.1 --directory target/isomer-studio
```

Open `http://127.0.0.1:5180/`. Use HTTP, not `file://`, for JavaScript modules,
editor workers, and WASM. The static build includes the gallery, reference,
Workbench, and browser-side JSX compilation; it needs no render server.

`check` validates and renders the registered examples on React, HTML, Markdown,
text, and Slack and writes `target/junit/isomer-studio.xml`. Existing production
primitive tests remain the conformance gate:

```sh
node scripts/jest x-pack/platform/packages/shared/isomer/isomer-components/src/pack.test.ts --runInBand
node scripts/check.js --scope=local
```

## Image capability boundary

The config supplies **no frames, image formats, or image fonts**. The runtime
therefore has no snapshot surface. Studio's dev host has no PNG/PDF renderers,
its build does not prerender images, and check cannot request `--png` through
the launcher. This is a runtime/host boundary, not hidden tabs.

The upstream CLI declares an image backend dependency, so its isolated `npx`
installation may contain it. It is not added to Kibana's dependency graph.
Every launcher command preloads `no_image_backend.ts`, which rejects resolving
Isomer image backends, Takumi, and PDFKit, including resolved file URLs.
Attempting to activate one fails rather than allocating native rasterization
resources. Do not invoke the upstream CLI directly or add frames to this config.
Editor workers are JavaScript editing infrastructure, not drawing workers.

PNG/PDF generation, render hosts, chart lowering, charts, and the Lens
synthetic-data app are outside this foundation.

## CI review artifact

PR changes under the shared Isomer directory or this CI step trigger
`isomer-studio` in Kibana's existing Buildkite PR pipeline. The step bootstraps
the job's checkout, runs check and build, then uploads:

- `target/isomer-studio.tar.gz`: the complete static site.
- `target/junit/isomer-studio.xml`: the check report.

The site's `build.json` records the actual checkout `sourceSha`, dirty status,
the exact Studio version, and Buildkite build/job identity. `requestedCommit`
records Buildkite's input separately from the actual SHA (which can be a merge
checkout). Review that metadata before comparing output to a PR.

This step uses `buildkite-agent artifact upload`, as other Kibana jobs do.
**It publishes a download artifact, not a live preview URL.** Kibana's Storybook
job separately uploads HTML/JS/CSS to `ci-artifacts.kibana.dev`, which serves
HTML directly; this foundation does not add a public site to that bucket.

Download `target/isomer-studio.tar.gz` from the job's Artifacts tab into an empty
review directory, then:

```sh
tar -xzf isomer-studio.tar.gz
cat isomer-studio/build.json
python3 -m http.server 5180 --bind 127.0.0.1 --directory isomer-studio
```

Open `http://127.0.0.1:5180/`. With authenticated Buildkite agent access, the
equivalent download from a specific build is:

```sh
buildkite-agent artifact download 'target/isomer-studio.tar.gz' . --build <build-id> --step isomer-studio
tar -xzf target/isomer-studio.tar.gz
python3 -m http.server 5180 --bind 127.0.0.1 --directory isomer-studio
```
