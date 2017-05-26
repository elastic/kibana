import MockLogstashFieldsProvider from 'fixtures/logstash_fields';
import sinon from 'auto-release-sinon';

import { IndexPatternsApiClientProvider } from '../index_patterns_api_client_provider';

// place in a ngMock.module() call to swap out the IndexPatternsApiClient
export function StubIndexPatternsApiClientModule(PrivateProvider) {
  PrivateProvider.swap(
    IndexPatternsApiClientProvider,
    Private => {
      let nonScriptedFields = Private(MockLogstashFieldsProvider).filter(field => (
        field.scripted !== true
      ));

      class StubIndexPatternsApiClient {
        getFieldsForTimePattern = sinon.spy(async () => {
          return nonScriptedFields;
        })

        getFieldsForWildcard = sinon.spy(async () => {
          return nonScriptedFields;
        })

        testTimePattern = sinon.spy(async () => {
          return {
            all: [],
            matches: []
          };
        })

        swapStubNonScriptedFields = (newNonScriptedFields) => {
          nonScriptedFields = newNonScriptedFields;
        }
      }

      return new StubIndexPatternsApiClient();
    }
  );
}
