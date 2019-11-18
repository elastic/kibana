# Documentation for APM UI developers

### Setup local environment

#### Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start
```

#### APM Server, Elasticsearch and data

To access an elasticsearch instance that has live data you have two options:

##### A. Connect to Elasticsearch on Cloud (internal devs only)

Find the credentials for the cluster [here](https://github.com/elastic/apm-dev/blob/master/docs/credentials/apm-ui-clusters.md#apmelstcco)

##### B. Start Elastic Stack and APM data generators

```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```

_Docker Compose is required_

### Debugging Elasticsearch queries

All APM api endpoints accept `_debug=true` as a query param that will result in the underlying ES query being outputted in the Kibana backend process.

Example:
`/api/apm/services/my_service?_debug=true`

### Unit testing

Note: Run the following commands from `kibana/x-pack`.

#### Run unit tests

```
node scripts/jest.js plugins/apm --watch
```

#### Update snapshots

```
node scripts/jest.js plugins/apm --updateSnapshot
```

### Linting

_Note: Run the following commands from `kibana/`._

#### Prettier

```
yarn prettier  "./x-pack/legacy/plugins/apm/**/*.{tsx,ts,js}" --write
```

#### ESLint

```
yarn eslint ./x-pack/legacy/plugins/apm --fix
```

#### Further resources

- [Cypress integration tests](cypress/README.md)
- [VSCode setup instructions](./dev_docs/vscode_setup.md)
- [Github PR commands](./dev_docs/github_commands.md)
