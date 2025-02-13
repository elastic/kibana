# Changelog
Significant or breaking changes to the Ingest Manager API will be documented in this file

## 2020-03-30

### Breaking Changes
* Change EPM file path route from epm/packages/{pkgkey}/{filePath*} to epm/packages/{packageName}/{packageVersion}/{filePath*} [#61910](https://github.com/elastic/kibana/pull/61910)