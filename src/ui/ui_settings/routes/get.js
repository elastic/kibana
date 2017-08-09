async function handleRequest(request) {
  const uiSettings = request.getUiSettingsService();
  return {
    settings: await uiSettings.getUserProvided()
  };
}

export const getRoute = {
  path: '/api/kibana/settings',
  method: 'GET',
  handler: function (request, reply) {
    reply(handleRequest(request));
  }
};
