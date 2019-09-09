# Documentation for APM UI developers

### Setup local environment

#### Kibana
```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start
```

#### Connect to Elasticsearch on Cloud (internal devs only)
Add the following to the kibana config file (config/kibana.dev.yml):
https://p.elstc.co/paste/fqorvbJi#Yf6tQ8Bxk4nYMWpoPXr1iZ-QnJ1EbKBEM+H/kdPsmBg

Note: Run the following commands from `kibana/x-pack`.

### Run tests
```
node scripts/jest.js plugins/apm --watch
```

### Update snapshots
```
node scripts/jest.js plugins/apm --updateSnapshot
```
---

Note: Run the following commands from `kibana/`.

### Prettier

```
yarn prettier  "./x-pack/legacy/plugins/apm/**/*.{tsx,ts,js}" --write
```

### ESLint
```
yarn eslint ./x-pack/legacy/plugins/apm --fix
```

### Ensure everything from master has been backported to 6.x
```
git fetch origin && git checkout 6.x && git diff origin/6.x..origin/master ./plugins/apm | git apply
```
