/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import type { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { SnapshotState, toMatchSnapshot as jestToMatchSnapshot } from 'jest-snapshot';
import { FtrProviderContext } from '../../ftr_provider_context';

interface MigrationTestSpec {
  fromVersion: string;
  testName: string;
  doc: SavedObjectUnsanitizedDoc;
}

function toMatchSnapshot(actual: any, testFile: string, testTitle: string) {
  // Initialize the SnapshotState, it's responsible for actually matching
  // actual snapshot with expected one and storing results to `__snapshots__` folder
  const snapshotState = new SnapshotState(testFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
    getPrettier: () => require('prettier'),
    getBabelTraverse: () => require('@babel/traverse'),
  });

  // Execute the matcher
  const result: ReturnType<typeof jestToMatchSnapshot> = jestToMatchSnapshot.call(
    // @ts-ignore
    {
      snapshotState,
      currentTestName: testTitle,
    },
    actual
  );

  // Store the state of snapshot, depending on updateSnapshot value
  snapshotState.save();

  // Return results outside
  return result;
}

export default function ({ getService }: FtrProviderContext) {
  const migrationsTests = fs
    .readdirSync(path.resolve(__dirname, 'tests'))
    .filter((file) => fs.statSync(path.resolve(__dirname, 'tests', file)).isDirectory())
    .flatMap((migrationDir) =>
      fs
        .readdirSync(path.resolve(__dirname, 'tests', migrationDir))
        .filter((file) => file.endsWith('.json'))
        .map(
          (migrationFile): MigrationTestSpec => {
            const migrationSpec = JSON.parse(
              fs
                .readFileSync(path.resolve(__dirname, 'tests', migrationDir, migrationFile), 'utf8')
                .toString()
            );

            return {
              fromVersion: migrationDir,
              testName: migrationFile.split('.json')[0],
              doc: migrationSpec.doc,
            };
          }
        )
    );

  const supertest = getService('supertest');

  describe('saved object migrations', () => {
    migrationsTests.forEach((test) => {
      it(`${test.fromVersion} - ${test.testName}`, async () => {
        const resp = await supertest.post(`/internal/saved_objects/_migrate/doc`).send({
          doc: test.doc,
        });

        const snapshotAssertRes = toMatchSnapshot(
          resp.body.doc,
          path.resolve(__dirname, 'tests', test.fromVersion, test.testName + '_migrated.snap'),
          `${test.fromVersion} - ${test.testName}`
        );

        if (!snapshotAssertRes.pass) {
          throw new Error(snapshotAssertRes.message());
        }
      });
    });
  });
}
