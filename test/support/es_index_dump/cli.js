/*************************************************************
 *
 *  Run `npm run esIndexDump -- --help` for usage information
 *
 *************************************************************/

import { resolve, relative } from 'path';
import { readFileSync } from 'fs';
import program from 'commander';

import { EsIndexDump } from './es_index_dump';

export function run(serverConfig) {

  program.description(`A simple CLI to expose the EsIndexDump class's functionality`);
  program.on('--help', () => {
    console.log(readFileSync(resolve(__dirname, './help.txt'), 'utf8'));
  });

  const makeAction = (method, description) =>
    program
      .command(`${method} <name> <index>`)
      .description(description)
      .option('--es-url [url]', 'url for elastisearch', 'http://localhost:9200')
      .option(`--data-dir [dir]`, 'where dump data is stored', serverConfig.esIndexDump.dataDir)
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

}
