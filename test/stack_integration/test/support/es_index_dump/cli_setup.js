/**
 *  Setup babel-transpilation and other environment things,
 *  then run the CLI
 *
 *  Use npm tasks to use this:
 *
 *    ```sh
 *    npm run esIndexDump -- --help
 *    ```
 *
 */
require('../env_setup');
require('./cli').run(require('../../server_config'));
