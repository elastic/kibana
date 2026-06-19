FROM mcr.microsoft.com/playwright:v1.56.1-noble

WORKDIR /work

RUN npm install @playwright/test@1.56.1 && npx playwright install --with-deps chromium
