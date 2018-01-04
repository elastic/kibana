import Joi from 'joi';

async function handleRequest(request) {
  const { key } = request.params;
  const { value } = request.payload;
  const uiSettings = request.getUiSettingsService();

  await uiSettings.set(key, value);

  return {
    settings: await uiSettings.getUserProvided()
  };
}

export const setRoute = {
  path: '/api/kibana/settings/{key}',
  method: 'POST',
  config: {
    validate: {
      params: Joi.object().keys({
        key: Joi.string().required(),
      }).default(),

      payload: Joi.object().keys({
        value: Joi.any().required()
      }).required()
    },
    handler(request, reply) {
      reply(handleRequest(request));
    }
  }
};
