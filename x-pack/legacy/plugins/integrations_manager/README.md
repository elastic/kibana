# Integrations Manager

## Development
### Branch
We're using a long-running feature branch [`feature-integrations-manager`](https://github.com/elastic/kibana/tree/feature-integrations-manager). 

<details>
  <summary>Keeping up to date with upstream kibana</summary>

```bash
## checkout feature branch to your fork
git checkout -B feature-integrations-manager origin/feature-integrations-manager

## make sure your feature branch is current with upstream feature branch
git pull upstream feature-integrations-manager

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
In your own fork of `elastic/kibana`, create a feature branch based on `feature-integrations-manager`.

```
git checkout -b 1234-feature-description feature-integrations-manager
# ... git commits for feature
open https://github.com/elastic/kibana/compare/feature-integrations-manager...yourgithubname:1234-feature-description
```

See https://github.com/elastic/kibana/pull/37950 for an example.

### Getting started
See the Kibana docs for [how to set up your dev environment](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment), [run Elasticsearch](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-elasticsearch), and [start Kibana](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-kibana).

One common workflow is:
 1. `yarn es snapshot`
 1. In another shell: `yarn start --no-base-path`
 
### Plugin architecture
Follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/master/style_guides/architecture_style_guide.md#file-and-folder-structure).

We use New Platform approach (structure, APIs, etc) where possible. There's a `kibana.json` manifest, and the server uses the `server/{index,plugin}.ts` approach from [`MIGRATION.md`](https://github.com/elastic/kibana/blob/master/src/core/MIGRATION.md#architecture). The client code we author is using New Platform shape & APIs, but the Manager deals with external systems which are at their own stages of migration.
