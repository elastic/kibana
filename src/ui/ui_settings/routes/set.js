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
  handler(request, reply) {
    reply(handleRequest(request));
  }
};
