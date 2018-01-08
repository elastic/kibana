Contains a version of Yarn which include the bugfix in
https://github.com/yarnpkg/yarn/pull/5059 to handle optional dependencies.

To build a new Yarn bundle, check out that pull requst and run:

```
yarn run build-bundle
```

This will create the file `artifacts/yarn-1.3.2.js`, which can be renamed and
moved to this folder.
