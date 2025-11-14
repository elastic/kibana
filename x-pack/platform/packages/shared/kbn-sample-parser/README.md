# @kbn/sample-log-parser

This library downloads, parses and re-generates data from [loghub](https://github.com/logpai/loghub), a collection of sample log data sets. It also supports log samples from select private repositories. The latter are only accessible to Elastic employees, and will fail without the right authentication.

## CLI

Run `AZURE_OPENAI_ENDPOINT=... AZURE_OPENAI_API_KEY=... node x-pack/scripts/sample_log_parser.js` to generate and validate Loghub parsers. Every parser exports functions that extract and replace timestamps in log messages from Loghub systems. A parser is considered valid if the extracted timestamp is the same as the replaced timestamp. If a parser does not exist or is not valid,
the LLM is used to re-generate a new one.

## SampleParserClient

`SampleParserClient` reads the parsers and the sample datasets, and returns generators that will replay the loghub sample sets with updated timestamps. If the indexing rate is higher than a certain maximum (currently 100rpm), it will replay the sample set at a lower speed.
