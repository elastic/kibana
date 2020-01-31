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
https://p.elstc.co/paste/wcp7hGUC#UkNNwAZg6cCasmUQNMw8ZXntSPuau5FMXCJkSnsvXU+

##### B. Start Elastic Stack and APM data generators

```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```

_Docker Compose is required_

### Setup default APM users

APM behaves differently depending on which the role and permissions a logged in user has.
For testing purposes APM uses 3 custom users:

**apm_read_user**: Apps: read. Indices: read (`apm-*`)

**apm_write_user**: Apps: read/write. Indices: read (`apm-*`)

**kibana_write_user** Apps: read/write. Indices: None

To create the users with the correct roles run the following script:

```sh
node x-pack/legacy/plugins/apm/scripts/setup-kibana-security.js --role-suffix <github-username-or-something-unique>
```

The users will be created with the password specified in kibana.dev.yml for `elasticsearch.password`

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

### Cypress E2E tests

See the Cypress-specific [readme.md](cypress/README.md)

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

### Visual Studio Code

When using [Visual Studio Code](https://code.visualstudio.com/) with APM it's best to set up a [multi-root workspace](https://code.visualstudio.com/docs/editor/multi-root-workspaces) and add the `x-pack/legacy/plugins/apm` directory, the `x-pack` directory, and the root of the Kibana repository to the workspace. This makes it so you can navigate and search within APM and use the wider workspace roots when you need to widen your search.

#### Using the Jest extension

The [vscode-jest extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) is a good way to run your Jest tests inside the editor.

Some of the benefits of using the extension over just running it in a terminal are:

• It shows the pass/fail of a test inline in the test file
• It shows the error message in the test file if it fails
• You don’t have to have the terminal process running
• It can automatically update your snapshots when they change
• Coverage mapping

The extension doesn't really work well if you're trying to use it on all of Kibana or all of X-Pack, but it works well if you configure it to run only on the files in APM.

If you have a workspace configured as described above you should have:

```json
"jest.disabledWorkspaceFolders": ["kibana", "x-pack"]
```

in your Workspace settings, and:

```json
"jest.pathToJest": "node scripts/jest.js --testPathPattern=legacy/plugins/apm",
"jest.rootPath": "../../.."
```

in the settings for the APM folder.

#### Jest debugging

To make the [VSCode debugger](https://vscode.readthedocs.io/en/latest/editor/debugging/) work with Jest (you can set breakpoints in the code and tests and use the VSCode debugger) you'll need the [Node Debug extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.node-debug2) installed and can set up a launch configuration like:

```json
{
  "type": "node",
  "name": "APM Jest",
  "request": "launch",
  "args": ["--runInBand", "--testPathPattern=legacy/plugins/apm"],
  "cwd": "${workspaceFolder}/../../..",
  "console": "internalConsole",
  "internalConsoleOptions": "openOnSessionStart",
  "disableOptimisticBPs": true,
  "program": "${workspaceFolder}/../../../scripts/jest.js",
  "runtimeVersion": "10.15.2"
}
```

#### Storybook

Start the [Storybook](https://storybook.js.org/) development environment with
`yarn storybook apm`. All files with a .stories.tsx extension will be loaded.
You can access the development environment at http://localhost:9001.

#### Further resources

(you'll want `runtimeVersion` to match what's in the Kibana root .nvmrc. Depending on your setup, you might be able to remove this line.)
