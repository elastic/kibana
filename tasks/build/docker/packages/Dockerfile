ARG node_version
FROM node:$node_version

ARG kibana_folder

RUN set -x && \
  apt-get update && \
  apt-get install -y \
    ruby-dev \
    ruby \
    zip \
    rpm
RUN gem install bundler

RUN groupadd --gid 1010 kibana \
  && useradd --uid 1010 --gid kibana --shell /bin/bash --create-home kibana

RUN mkdir -p $kibana_folder
COPY . $kibana_folder
RUN chown -R kibana:kibana $kibana_folder

USER kibana

WORKDIR /tmp
COPY tasks/build/docker/packages/Gemfile .
COPY tasks/build/docker/packages/Gemfile.lock .
RUN bundle install --deployment
ENV BUNDLE_GEMFILE=/tmp/Gemfile

WORKDIR $kibana_folder
ENV NPM_CONFIG_LOGLEVEL error
RUN npm install


CMD node_modules/.bin/grunt build $BUILD_OPTIONS
