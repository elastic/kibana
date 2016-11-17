import { resolve } from 'path';
import { stat } from 'fs';

import del from 'del';
import mkdirp from 'mkdirp';
import { fromNode } from 'bluebird';
import { Client } from 'elasticsearch';

import { elasticDump } from './elastic_dump';

const outputTransport = require.resolve('./transports/gzip_output');
const inputTransport = require.resolve('./transports/gunzip_input');

export class EsIndexDump {
  constructor({ esUrl, dataDir, log }) {
    this.esUrl = esUrl;
    this.dataDir = dataDir;
    this.log = log;
    this.client = new Client({
      host: esUrl,
      keepAlive: false
    });
  }

  /**
   *  Extract data and mappings from an elasticsearch index and store
   *  it in the dataDir so it can be used later to recreate the index.
   *
   *  @param {string} name - the name of this dump, used to determine output
   *                       filename. Passing the same name to `#load()`
   *                       will recreate the index as it was
   *  @param {string} inputIndex - the index to dump
   *  @return Promise<undefined>
   */
  async dump(name, inputIndex) {
    const { esUrl, dataDir, log, client } = this;
    const dumpDir = resolve(dataDir, name);

    const dumpType = async type => {
      const output = resolve(dataDir, name, `${type}.json.gz`);
      log('Dumping %s from %s/%s to %s', type, esUrl, inputIndex, output);
      await elasticDump(log, {
        type,
        input: esUrl,
        'input-index': inputIndex,
        output,
        outputTransport,
      });
    };

    // verify the selected index
    const indices = Object.keys(await client.indices.get({
      index: inputIndex,
      filterPath: ['-*.mappings','-*.settings'],
    }));
    if (!indices.length) {
      throw new Error(`"${inputIndex}" is not an index in elasticsearch`);
    }
    if (indices.length > 1) {
      throw new Error(`"${inputIndex}" must resolve to a single index, found ${indices.length}`);
    }

    // wipe out the target
    await del(dumpDir);
    await fromNode(cb => mkdirp(dumpDir, cb));

    await dumpType('mapping');
    await dumpType('data');
  }

  /**
   *  Load data and mappings that was previously dumped using `#dump()`.
   *
   *  @param {string} name - the name of the dump to load
   *  @param {string} targetIndex
   *  @return Promise<undefined>
   */
  async load(name, outputIndex) {
    const { esUrl, dataDir, log, client } = this;
    const dumpDir = resolve(dataDir, name);

    const loadType = async type => {
      const input = resolve(dumpDir, `${type}.json.gz`);
      log('Loading %s from %s to %s/%s', type, input, esUrl, outputIndex);
      await elasticDump(log, {
        type,
        input,
        inputTransport,
        output: esUrl,
        'output-index': outputIndex,
        toLog: false,
      });
    };

    // validate that the dump directory exists
    try {
      const stats = await fromNode(cb => stat(dumpDir, cb));
      if (!stats.isDirectory()) {
        throw new TypeError(`Expected dump "${name}" to be a directory.`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Unkown dump "${name}"`);
      } else {
        throw err;
      }
    }

    // wipe out the target index
    await client.indices.delete({ index: outputIndex, ignore: [404] });

    await loadType('mapping');
    await loadType('data');
  }
}
