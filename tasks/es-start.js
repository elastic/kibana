import childProcess from 'child_process';
import  bluebird  from 'bluebird';

const runCommand = bluebird.promisify(childProcess.exec);
const runFile = bluebird.promisify(childProcess.execFile);
const esRepo = `../elasticsearch/`;
const esDest = `${esRepo}distribution/tar/build/distributions/`;

/**
 * EXPERIMENTAL
 *
 * Build ES from source and startup. It ensures Kibana and Elasticsearch share the same major branch.
 *
 * The setup requires Kibana and Elasticsearch are on the same directory level
 *
 * Limitations:
 * - *NIX only.
 * - X-plugins not yet supported
 *
 * @param grunt
 */
module.exports = function (grunt) {

  grunt.registerTask('es-start', async function () {

    const taskDone = this.async();
    const currentLocation = await runCommand('pwd');

    try {
      const kibanaTags = await runCommand('git tag');
      const elasticTags = await runCommand(`cd ${esRepo} && git tag`);
      const kibanaMajor = getMajorVersion(kibanaTags[0]);
      const elasticsearchMajor = getMajorVersion(elasticTags[0]);

      console.log('Ensuring major branches are the same.');
      if (kibanaMajor !== elasticsearchMajor) {
        const message = `Kibana and Elasticsearch must be on
         the same major branch: Kibana=${kibanaMajor}, Elasticsearch=${elasticsearchMajor}`;
        throw new Error(message);
      }

      if (kibanaMajor < 5) {
        throw new Error('Must at least be at version 5');
      }


      console.log('Building Elasticsearch. This may take a while if this is the first time.');
      try {
        await runCommand('cd ../elasticsearch && gradle assemble -x test');
      } catch (e) {
        throw new Error('Could not build ElasticSearch');
      }

      const distrib = await runCommand(`find ${esRepo}distribution/tar/build/distributions/elasticsearch*.tar.gz`);
      const zipFile = distrib[0].trim();
      console.log('Unpacking ES');
      await runCommand(`tar -xzvf ${zipFile} -C ${esDest}`);


      let esDistro = await runCommand(`find ${esDest} -name 'elasticsearch*' -type d`);
      esDistro = esDistro[0].trim();
      console.log('Starting ES');
      await runFile(`${esDistro}/bin/elasticsearch`);
    } catch (e) {
      console.error('Cannot start Elasticsearch.');
      console.error(e);
    } finally {
      console.log('Tearing down process');
      await runCommand(`cd ${currentLocation}`);
      taskDone(false);
    }


  });

};

function getMajorVersion(gitResponse) {
  const lines = gitResponse.split('\n').filter(s => s.startsWith('v'));
  const lastTag = lines[lines.length - 1].trim();
  return parseInt(lastTag.substr(1, 1));
}
