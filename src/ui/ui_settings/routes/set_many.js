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
  handler: function (request, reply) {
    reply(handleRequest(request));
  }
};
