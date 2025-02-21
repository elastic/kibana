/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-extraneous-dependencies */

import Path from 'path';

import webpack from 'webpack';
import { ToolingLog } from '@kbn/tooling-log';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { isNormalModule, isConcatenatedModule } from '@kbn/optimizer-webpack-helpers';

const IGNORED_EXTNAME = ['.map', '.br', '.gz'];

interface Asset {
  name: string;
  size: number;
}

export class CiStatsPlugin {
  constructor(
    private readonly options: {
      entryName: string;
    }
  ) {}

  public apply(compiler: webpack.Compiler) {
    const log = new ToolingLog({
      level: 'error',
      writeTo: process.stdout,
    });
    const ciStats = CiStatsReporter.fromEnv(log);
    if (!ciStats.isEnabled()) {
      return;
    }

    compiler.hooks.emit.tapPromise('CiStatsPlugin', async (compilation) => {
      const { entryName } = this.options;

      const assets = Object.entries(compilation.assets)
        .map(
          ([name, source]: [string, any]): Asset => ({
            name,
            size: source.size(),
          })
        )
        .filter((asset) => {
          const filename = Path.basename(asset.name);
          if (filename.startsWith('.')) {
            return false;
          }

          const ext = Path.extname(filename);
          if (IGNORED_EXTNAME.includes(ext)) {
            return false;
          }

          return true;
        });

      const entry = assets.find((a) => a.name === `${entryName}.js`);
      if (!entry) {
        throw new Error(`Unable to find bundle entry named [${entryName}]`);
      }

      const moduleCount = Array.from(compilation.modules).reduce((acc, module) => {
        if (isNormalModule(module)) {
          return acc + 1;
        }

        if (isConcatenatedModule(module)) {
          return acc + module.modules.length;
        }

        return acc;
      }, 0);

      if (moduleCount === 0) {
        throw new Error(`unable to determine module count`);
      }

      await ciStats.metrics([
        {
          group: `canvas shareable runtime`,
          id: 'total size',
          value: entry.size,
        },
        {
          group: `canvas shareable runtime`,
          id: 'misc asset size',
          value: assets.filter((a) => a !== entry).reduce((acc: number, a) => acc + a.size, 0),
        },
        {
          group: `canvas shareable runtime`,
          id: 'module count',
          value: moduleCount,
        },
      ]);
    });
  }
}
