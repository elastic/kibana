export default (grunt) => {
  const VERSION = grunt.config.get('build.version');
  const SHORT_SHA = grunt.config.get('build.sha').substr(0, 7);

  const FOLDER_STAGING = `kibana/staging/${VERSION}-${SHORT_SHA}/repos/${VERSION.match(/\d\./)[0]}x`;
  const FOLDER_PRODUCTION = `kibana/${VERSION.match(/\d\./)[0]}x`;

  const FOLDERNAME_DEB = 'debian';
  const FOLDERNAME_RPM = 'centos';

  const PREFIX_STAGING_DEB = `${FOLDER_STAGING}/${FOLDERNAME_DEB}`;
  const PREFIX_STAGING_RPM = `${FOLDER_STAGING}/${FOLDERNAME_RPM}`;
  const PREFIX_PRODUCTION_DEB = `${FOLDER_PRODUCTION}/${FOLDERNAME_DEB}`;
  const PREFIX_PRODUCTION_RPM = `${FOLDER_PRODUCTION}/${FOLDERNAME_RPM}`;

  const FOLDER_CONFIG = '/etc/kibana';
  const FOLDER_HOME = '/usr/share/kibana';
  const FOLDER_DATA = '/var/lib/kibana';
  const FOLDER_LOGS = '/var/log/kibana';
  const FOLDER_PLUGINS = `${FOLDER_HOME}/plugins`;

  const FILE_KIBANA_CONF = `${FOLDER_CONFIG}/kibana.yml`;
  const FILE_KIBANA_BINARY = `${FOLDER_HOME}/bin/kibana`;

  return {
    publish: {
      staging: {
        bucket: 'download.elasticsearch.org',
        debPrefix: PREFIX_STAGING_DEB,
        rpmPrefix: PREFIX_STAGING_RPM
      },
      production: {
        bucket: 'packages.elasticsearch.org',
        debPrefix: PREFIX_PRODUCTION_DEB,
        rpmPrefix: PREFIX_PRODUCTION_RPM
      }
    },
    user: 'kibana',
    group: 'kibana',
    name: 'kibana',
    description: 'Explore\ and\ visualize\ your\ Elasticsearch\ data',
    site: 'https://www.elastic.co',
    vendor: 'Elasticsearch,\ Inc.',
    maintainer: 'Kibana Team\ \<info@elastic.co\>',
    license: 'Apache\ 2.0',
    version: VERSION,
    path: {
      conf: FOLDER_CONFIG,
      data: FOLDER_DATA,
      plugins: FOLDER_PLUGINS,
      logs: FOLDER_LOGS,
      home: FOLDER_HOME,
      kibanaBin: FILE_KIBANA_BINARY,
      kibanaConfig: FILE_KIBANA_CONF
    }
  };
};
