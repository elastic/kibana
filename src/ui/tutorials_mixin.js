import _ from 'lodash';
import Joi from 'joi';
import { tutorialSchema } from '../core_plugins/kibana/common/tutorials/tutorial_schema';

export function tutorialsMixin(kbnServer, server) {
  const tutorials = [];

  server.decorate('server', 'getTutorials', () => {
    return _.cloneDeep(tutorials);
  });

  server.decorate('server', 'registerTutorial', (specProvider) => {
    const { error, value } = Joi.validate(specProvider(server), tutorialSchema);

    if (error) {
      throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
    }

    tutorials.push(value);
  });
}
