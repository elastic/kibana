export async function KibanaIndexProvider({ getService }) {
  const retry = getService('retry');
  const es = getService('es');

  const KIBANA_INDEX_NAME = '.kibana';
  const esIndex = await retry.try(async () => {
    return await es.indices.get({
      index: KIBANA_INDEX_NAME
    });
  });

  return new class KibanaIndex {
    getName() {
      return KIBANA_INDEX_NAME;
    }

    getMappingsDsl() {
      return Object.values(esIndex)[0].mappings;
    }
  };
}
