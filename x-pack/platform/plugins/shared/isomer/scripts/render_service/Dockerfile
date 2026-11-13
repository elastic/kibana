# The Isomer render service: Kibana's primitive packs and the render process, bundled by `bundle.js`, on the
# published Isomer packages and rasterizers from npm. Shaped after page-render-service's image: a slim Node
# base, production dependencies only, tini as PID 1, an unprivileged user.

FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The externals the bundle imports, pinned by bundle.js to this checkout's versions. npm picks the native
# builds for the image's platform (@napi-rs/canvas, @takumi-rs/core).
COPY package.json ./
# --legacy-peer-deps: Kibana installs these with pnpm and strictPeerDependencies off (Elastic Charts asks for an older moment-timezone than Kibana pins).
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts --legacy-peer-deps && npm cache clean --force
# Kibana's patches/vega-canvas@2.0.0.patch: resolve vega-canvas's browser build under Node. The Node build's
# top-level `await import('canvas')` cannot be required from CommonJS, and headless SVG rendering needs no canvas.
RUN node -e "const f='node_modules/vega-canvas/package.json', p=require('./'+f); p.exports.node=p.exports.default; require('fs').writeFileSync(f, JSON.stringify(p, null, 2))"

COPY dist ./dist

ENV PORT=3000
ENV LISTEN_HOST=0.0.0.0
EXPOSE 3000

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/service.js"]
