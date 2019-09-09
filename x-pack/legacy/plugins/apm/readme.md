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
Add the following to the kibana config file (config/kibana.dev.yml):
https://p.elstc.co/paste/fqorvbJi#Yf6tQ8Bxk4nYMWpoPXr1iZ-QnJ1EbKBEM+H/kdPsmBg

##### B. Start Elastic Stack and APM data generators
```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```
*Docker Compose is required*

### Test

Note: Run the following commands from `kibana/x-pack`.

#### Run tests
```
node scripts/jest.js plugins/apm --watch
```

#### Update snapshots
```
node scripts/jest.js plugins/apm --updateSnapshot
```
---

### Linting

Note: Run the following commands from `kibana/`.

#### Prettier

```
yarn prettier  "./x-pack/legacy/plugins/apm/**/*.{tsx,ts,js}" --write
```

#### ESLint
```
yarn eslint ./x-pack/legacy/plugins/apm --fix
```
