export function createFieldsFetcher(apiClient, config) {
  class FieldsFetcher {
    fetch(indexPattern) {
      if (indexPattern.isTimeBasedInterval()) {
        const interval = indexPattern.getInterval().name;
        return this.fetchForTimePattern(indexPattern.id, interval);
      }

      return this.fetchForWildcard(indexPattern.id);
    }

    testTimePattern(indexPatternId) {
      return apiClient.testTimePattern({
        pattern: indexPatternId
      });
    }

    fetchForTimePattern(indexPatternId) {
      return apiClient.getFieldsForTimePattern({
        pattern: indexPatternId,
        lookBack: config.get('indexPattern:fieldMapping:lookBack'),
        metaFields: config.get('metaFields'),
      });
    }

    fetchForWildcard(indexPatternId) {
      return apiClient.getFieldsForWildcard({
        pattern: indexPatternId,
        metaFields: config.get('metaFields'),
      });
    }
  }

  return new FieldsFetcher();
}
