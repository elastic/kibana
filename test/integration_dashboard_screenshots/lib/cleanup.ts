import { createEsClient } from './kibana_client';

const getConfig = () => {
  const esUrl = process.env.ELASTICSEARCH_URL;
  const user = process.env.ES_USER || 'elastic';
  const password = process.env.ES_PASSWORD || 'changeme';

  if (!esUrl) {
    throw new Error('ELASTICSEARCH_URL is required. Set it in .env or as an environment variable.');
  }

  return { esUrl, user, password };
};

const main = async () => {
  const config = getConfig();
  const es = createEsClient({
    baseUrl: config.esUrl,
    username: config.user,
    password: config.password,
  });

  console.log('=== Cleanup: Deleting seeded data streams ===');
  console.log(`ES: ${config.esUrl}\n`);

  const res = await es.get('/_data_stream/logs-*,metrics-*');
  if (res.status !== 200) {
    console.error(`Failed to list data streams: ${res.status}`);
    process.exit(1);
  }

  const streams: Array<{ name: string; backing_indices: unknown[] }> = res.body?.data_streams ?? [];
  const seeded = streams.filter(
    (s) =>
      s.name.endsWith('-default') &&
      !s.name.startsWith('logs-elastic_agent') &&
      !s.name.startsWith('metrics-elastic_agent') &&
      !s.name.startsWith('metrics-fleet_server')
  );

  if (seeded.length === 0) {
    console.log('No seeded data streams found.');
    return;
  }

  console.log(`Found ${seeded.length} data streams to delete:\n`);

  for (const stream of seeded) {
    const docCount = Array.isArray(stream.backing_indices) ? stream.backing_indices.length : '?';
    const deleteRes = await es.delete(`/_data_stream/${stream.name}`);
    const status = deleteRes.status === 200 ? 'deleted' : `failed (${deleteRes.status})`;
    console.log(`  ${stream.name} [${docCount} backing index(es)] - ${status}`);
  }

  console.log('\nDone!');
};

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
