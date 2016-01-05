export default function createUrlShortener(Notifier, $http, $location) {
  const notify = new Notifier({
    location: 'Url Shortener'
  });
  const baseUrl = `${$location.protocol()}://${$location.host()}:${$location.port()}`;

  async function shortenUrl(url) {
    const relativeUrl = url.replace(baseUrl, '');
    const formData = { url: relativeUrl };

    try {
      const result = await $http.post('/shorten', formData);

      return `${baseUrl}/goto/${result.data}`;
    } catch (err) {
      notify.error(err);
      throw err;
    }
  }

  return {
    shortenUrl
  };
};
