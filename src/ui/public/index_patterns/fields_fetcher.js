export function createFieldsFetcher(apiClient, config) {
  class FieldsFetcher {
    fetch(indexPattern) {
      return this.fetchForWildcard(indexPattern.id);
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
