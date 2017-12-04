import Joi from 'joi';
import boom from 'boom';
import { InvalidValueError } from '../ui_settings_service';

async function handleRequest(request) {
  const { key } = request.params;
  const { value } = request.payload;
  const uiSettings = request.getUiSettingsService();

  try {
    await uiSettings.set(key, value);
  } catch (err) {
    if (err instanceof InvalidValueError) {
      return boom.badRequest(err.message);
    }

    throw err;
  }

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
