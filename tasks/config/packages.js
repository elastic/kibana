export default (grunt) => {
  const version = grunt.config.get('pkg.version');
  const productionPath = `kibana/${version.match(/\d\.\d/)[0]}`;
  const stagingPath = `kibana/staging/${version.match(/\d\.\d\.\d/)[0]}-XXXXXXX/repos/${version.match(/\d\./)[0]}x`;
  const rpmFolder = 'centos';
  const debFolder = 'debian';

  return {
    staging: {
      bucket: 'download.elasticsearch.org',
      debPrefix: `${stagingPath}/${debFolder}`,
      rpmPrefix: `${stagingPath}/${rpmFolder}`
    },
    production: {
      bucket: 'packages.elasticsearch.org',
      debPrefix: `${productionPath}/${debFolder}`,
      rpmPrefix: `${productionPath}/${rpmFolder}`
    }
  };
};
