// Smokescreen tests for core migration logic. Each test is large, so they are each
// given their own file.

import _ from 'lodash';
import { migrateOldIndexTest } from './migrate_old_index_test';
import { migrateNonexistantIndexTest } from './migrate_nonexistant_index_test';
import { migrateExistingTest } from './migrate_existing_test';

export default function ({ getService }) {
  const es = getService('es');
  const callCluster = (path, ...args) => _.get(es, path).call(es, ...args);
  const helper = { callCluster };

  describe('migrate', () => {
    migrateNonexistantIndexTest(helper);
    migrateOldIndexTest(helper);
    migrateExistingTest(helper);
  });
}
