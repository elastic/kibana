/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Languages, LanguageDefinition } from '@kbn/search-api-panels';
import { i18n } from '@kbn/i18n';

const INDEX_NAME_PLACEHOLDER = 'index_name';

export const curlDefinition: LanguageDefinition = {
  id: Languages.CURL,
  name: i18n.translate('xpack.idxMgmt.indexDetails.languages.cURL', {
    defaultMessage: 'cURL',
  }),
  iconType: 'curl.svg',
  languageStyling: 'shell',
  ingestDataIndex: ({ apiKey, indexName, url }) => `curl -X POST ${url}/_bulk?pretty \\
  -H "Authorization: ApiKey ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d'
{ "index" : { "_index" : "${indexName ?? INDEX_NAME_PLACEHOLDER}" } }
{"name": "foo", "title": "bar" }
'
`,
};

export const javascriptDefinition: LanguageDefinition = {
  id: Languages.JAVASCRIPT,
  name: i18n.translate('xpack.idxMgmt.indexDetails.languages.javascript', {
    defaultMessage: 'JavaScript',
  }),
  iconType: 'javascript.svg',
  ingestDataIndex: ({
    apiKey,
    url,
    indexName,
  }) => `const { Client } = require('@elastic/elasticsearch');
const client = new Client({
  node: '${url}',
  auth: {
      apiKey: '${apiKey}'
  }
});
const dataset = [
  {'name': 'foo', 'title': 'bar'},
];

// Index with the bulk helper
const result = await client.helpers.bulk({
  datasource: dataset,
  onDocument (doc) {
    return { index: { _index: '${indexName ?? 'index_name'}' }};
  }
});
console.log(result);
`,
};

export const goDefinition: LanguageDefinition = {
  id: Languages.GO,
  name: i18n.translate('xpack.idxMgmt.indexDetails.languages.go', {
    defaultMessage: 'Go',
  }),
  iconType: 'go.svg',
  ingestDataIndex: ({ apiKey, url, indexName }) => `import (
  "context"
  "fmt"
  "log"
  "strings"

  "github.com/elastic/elasticsearch-serverless-go"
)

func main() {
  cfg := elasticsearch.Config{
    Address: "${url}",
    APIKey: "${apiKey}",
  }
  es, err := elasticsearch.NewClient(cfg)
  if err != nil {
    log.Fatalf("Error creating the client: %s", err)
  }
  res, err := es.Bulk().
    Index("${indexName}").
    Raw(strings.NewReader(\`
{ "index": { "_id": "1"}}
{"name": "foo", "title": "bar"}\n\`)).
    Do(context.Background())

  fmt.Println(res, err)
}`,
};

export const pythonDefinition: LanguageDefinition = {
  id: Languages.PYTHON,
  name: i18n.translate('xpack.idxMgmt.indexDetails.languages.python', {
    defaultMessage: 'Python',
  }),
  iconType: 'python.svg',
  ingestDataIndex: ({ apiKey, url, indexName }) => `from elasticsearch import Elasticsearch

client = Elasticsearch(
  "${url}",
  api_key="${apiKey}"
)

documents = [
  {"index": {"_index": "${indexName ?? INDEX_NAME_PLACEHOLDER}"}},
  {"name": "foo", "title": "bar"},
]

client.bulk(operations=documents)
`,
};

export const phpDefinition: LanguageDefinition = {
  id: Languages.PHP,
  name: i18n.translate('xpack.idxMgmt.indexDetails.languages.php', {
    defaultMessage: 'PHP',
  }),
  iconType: 'php.svg',
  ingestDataIndex: ({ apiKey, url, indexName }) => `$client = ClientBuilder::create()
  ->setHosts(['${url}'])
  ->setApiKey('${apiKey}')
  ->build();

$params = [
'body' => [
[
'index' => [
'_index' => '${indexName ?? INDEX_NAME_PLACEHOLDER}',
'_id' => '1',
],
],
[
'name' => 'foo',
'title' => 'bar',
],
],
];

$response = $client->bulk($params);
echo $response->getStatusCode();
echo (string) $response->getBody();
`,
};

export const rubyDefinition: LanguageDefinition = {
  id: Languages.RUBY,
  name: i18n.translate('xpack.idxMgmt.indexDetails.languages.ruby', {
    defaultMessage: 'Ruby',
  }),
  iconType: 'ruby.svg',
  ingestDataIndex: ({ apiKey, url, indexName }) => `client = ElasticsearchServerless::Client.new(
  api_key: '${apiKey}',
  url: '${url}'
)

documents = [
  { index: { _index: '${
    indexName ?? INDEX_NAME_PLACEHOLDER
  }', data: {name: "foo", "title": "bar"} } },
]
client.bulk(body: documents)
`,
};

const languageDefinitionRecords: Partial<Record<Languages, LanguageDefinition>> = {
  [Languages.CURL]: curlDefinition,
  [Languages.PYTHON]: pythonDefinition,
  [Languages.JAVASCRIPT]: javascriptDefinition,
  [Languages.PHP]: phpDefinition,
  [Languages.GO]: goDefinition,
  [Languages.RUBY]: rubyDefinition,
};

export const languageDefinitions: LanguageDefinition[] = Object.values(languageDefinitionRecords);
