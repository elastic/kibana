import Joi from 'joi';
import boom from 'boom';
import { InvalidValueError } from '../ui_settings_service';

async function handleRequest(request) {
  const { changes } = request.payload;
  const uiSettings = request.getUiSettingsService();

  try {
    await uiSettings.setMany(changes);
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
