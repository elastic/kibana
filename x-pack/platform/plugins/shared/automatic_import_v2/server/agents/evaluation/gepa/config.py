"""
Configuration for GEPA evaluation (Kibana URL, connector, auth).
Read from environment variables; loads .env in this directory if present.
"""
import os

from dotenv import load_dotenv

# Load .env from the same directory as this file (gepa/)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

KIBANA_URL = os.environ.get("KIBANA_URL", "http://localhost:5601")
CONNECTOR_ID = os.environ.get("GEPA_CONNECTOR_ID", "")
# Optional: path to a JSON file with { "Authorization": "Bearer <token>" } or similar
# For internal API use the same auth as the browser (e.g. run from same host with cookie).
AUTH_HEADERS = os.environ.get("GEPA_AUTH_HEADERS", "")  # JSON string or leave empty for no auth
