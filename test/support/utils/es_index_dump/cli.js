import { resolve, relative } from 'path';
import program from 'commander';

import { EsIndexDump } from './es_index_dump';

const DEFAULT_DATA_DIR = relative(
  process.cwd(),
  resolve(__dirname, '../../../fixtures/dump_data')
);

const makeAction = (method, description) =>
  program
    .command(`${method} <name> <index>`)
    .description(description)
    .option('--es-url [url]', 'url for elastisearch', 'http://localhost:9200')
    .option(`--data-dir [dir]`, 'where dump data is stored', DEFAULT_DATA_DIR)
    .action((name, index, options) => {
      const esIndexDump = new EsIndexDump({
        esUrl: options.esUrl,
        dataDir: options.dataDir,
        log: console.log
      });

      esIndexDump[method](name, index).catch(err => {
        console.error('FATAL ERROR', err.stack);
      });
    });

makeAction('dump', 'dump the contents of an index to disk');
makeAction('load', 'load the contents of a dump into elasticsearch');

program.parse(process.argv);

const cmd = program.args.find(a => typeof a === 'object');
if (!cmd) {
  program.help();
}
