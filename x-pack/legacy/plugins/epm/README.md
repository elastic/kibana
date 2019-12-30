# Integrations Manager

## Development
### Branch
We're using a long-running feature branch [`feature-ingest`](https://github.com/elastic/kibana/tree/feature-ingest). 

<details>
  <summary>Keeping up to date with upstream kibana</summary>

```bash
## checkout feature branch to your fork
git checkout -B feature-ingest origin/feature-ingest

## make sure your feature branch is current with upstream feature branch
git pull upstream feature-ingest

## pull in changes from upstream master
git pull upstream master

## push changes to your remote
git push origin

# Open a **DRAFT PR**. Normal PRs will re-notify authors of commits already merged
# Draft PR will trigger CI run. Once CI is green ...

## push your changes to upstream feature branch
git push upstream
```
</details>

### Feature development
In your own fork of `elastic/kibana`, create a feature branch based on `feature-ingest`.

```
git checkout -b 1234-feature-description feature-ingest
# ... git commits for feature
open https://github.com/elastic/kibana/compare/feature-ingest...yourgithubname:1234-feature-description
```

See https://github.com/elastic/kibana/pull/37950 for an example.

### Getting started
See the Kibana docs for [how to set up your dev environment](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment), [run Elasticsearch](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-elasticsearch), and [start Kibana](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-kibana).

One common workflow is:
 1. `yarn es snapshot`
 1. In another shell: `yarn start --no-base-path`

#### API Tests
  1. in one terminal, change to the `x-pack` directory and start the test server with
      ```shell
      node scripts/functional_tests_server.js --config test/epm_api_integration/config.ts
      ```

  1. in a second terminal, run the tests from the Kibana root directory with
      ```shell
      node scripts/functional_test_runner.js --config x-pack/test/epm_api_integration/config.ts
      ```
 
### Plugin architecture
Follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/master/style_guides/architecture_style_guide.md#file-and-folder-structure).

We use New Platform approach (structure, APIs, etc) where possible. There's a `kibana.json` manifest, and the server uses the `server/{index,plugin}.ts` approach from [`MIGRATION.md`](https://github.com/elastic/kibana/blob/master/src/core/MIGRATION.md#architecture). The client code we author is using New Platform shape & APIs, but the Manager deals with external systems which are at their own stages of migration.
