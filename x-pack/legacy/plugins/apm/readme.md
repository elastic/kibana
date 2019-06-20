# Documentation for APM UI

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
yarn prettier  "./x-pack/plugins/apm/**/*.{tsx,ts,js}" --write
```

### ESLint
```
yarn eslint ./x-pack/plugins/apm --fix
```

### Ensure everything from master has been backported to 6.x
```
git fetch origin && git checkout 6.x && git diff origin/6.x..origin/master ./plugins/apm | git apply
```
