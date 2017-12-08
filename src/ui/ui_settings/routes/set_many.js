import Joi from 'joi';

async function handleRequest(request) {
  const { changes } = request.payload;
  const uiSettings = request.getUiSettingsService();

  await uiSettings.setMany(changes);

  return {
    settings: await uiSettings.getUserProvided()
  };
}

export const setManyRoute = {
  path: '/api/kibana/settings',
  method: 'POST',
  config: {
    validate: {
      payload: Joi.object().keys({
        changes: Joi.object().unknown(true).required()
      }).required()
    },
    handler(request, reply) {
      reply(handleRequest(request));
    }
  }
};
