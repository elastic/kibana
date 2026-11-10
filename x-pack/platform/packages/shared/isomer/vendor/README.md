# Vendored Isomer packages (temporary)

These tarballs stand in for Isomer packages that aren't published yet, or whose published versions predate the chart work. Remove each one, and its `package.json` entries, once Isomer publishes a version that has it (`@next` from `main`, after `feature/charts-rendering` merges).

| Tarball | Package | Why it's vendored |
| --- | --- | --- |
| `elastic-isomer-sdk-0.0.0-c8.05c3442.tgz` | `@elastic/isomer-sdk` | The charts pack needs the SDK on `feature/charts-rendering`: the React-free `./schema` entry, pack input budgets and `contextWith` |
| `elastic-isomer-runtime-0.0.0-c8.05c3442.tgz` | `@elastic/isomer-runtime` | Joins each pack's style adapter, so the components pack and the charts pack compose in one runtime |
| `elastic-isomer-primitives-charts-0.0.0-c8.05c3442.tgz` | `@elastic/isomer-primitives-charts` | `private` and unpublished |
| `elastic-isomer-charts-elastic-0.0.0-c8.05c3442.tgz` | `@elastic/isomer-charts-elastic` | `private` and unpublished. Its `./headless` entry replaces `@elastic/isomer-charts-elastic-node` |
| `elastic-charts-73.3.2-pr2939-a87de627.tgz` | `@elastic/charts` | The headless SVG renderer (`dist/headless`) the engine's `./headless` entry needs. See below |

All of them are packed from one Isomer commit, so they match each other:

- Branch: `clintandrewhall-chart-breadth-legacy-metric` (elastic/isomer#388), the top of the open chart stack on `feature/charts-rendering`: #384 heatmap, #385 gauge, #386 tagCloud, #388 legacyMetric
- Commit: `05c34426`, which includes `feature/charts-rendering` at `f0068a08`
- Version stamp: `0.0.0-c8.05c3442`. Pack versions (elastic/isomer#312) isn't merged, so nothing here depends on it.

The root `package.json` pins each tarball, and `resolutions` points `@elastic/isomer-sdk`, `@elastic/isomer-runtime` and `@elastic/isomer-primitives-charts` at theirs, since the packed packages depend on that exact, unpublished version.

## Elastic Charts with headless rendering (temporary, this branch only)

`elastic-charts-73.3.2-pr2939-a87de627.tgz` is `@elastic/charts` 73.3.2 with headless SVG rendering, built from [elastic/elastic-charts#2939](https://github.com/elastic/elastic-charts/pull/2939) (`feat/headless-render`, a draft) at `a87de627`, with the two patches Isomer's `vendor/elastic-charts` applies: numeric font weights on SVG `<text>`, and `renderChart` returning `{ debugState }`. It is the tarball Isomer's `feature/charts-rendering` vendors, copied byte for byte.

The root `package.json` replaces Kibana's `@elastic/charts` with it, as a dependency and in `resolutions`, so every Kibana chart uses this build on this branch. It must not reach `main`. Once #2939 ships in an Elastic Charts release, delete the tarball and the `resolutions` entry, and set `@elastic/charts` to that release.

## Repacking

From a checkout of elastic/isomer at the commit to vendor:

```sh
pnpm install --frozen-lockfile && pnpm -r build
V=0.0.0-c<n>.<short sha>
for n in isomer-sdk isomer-runtime isomer-primitives-charts isomer-charts-elastic; do
  (cd packages/$n && npm pkg set version=$V && npm pkg delete private && pnpm pack --pack-destination <kibana>/x-pack/platform/packages/shared/isomer/vendor)
done
```

`pnpm pack` turns each `workspace:*` dependency into `$V`. Then update the file names in the root `package.json` (`dependencies` and `resolutions`), delete the old tarballs and run `pnpm kbn bootstrap`.
