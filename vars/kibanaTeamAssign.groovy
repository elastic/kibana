def load (title) {
  kibanaPipeline.bash("""
    source src/dev/ci_setup/setup_env.sh
    yarn kbn bootstrap --prefer-offline

    . src/dev/code_coverage/shell_scripts/assign_teams.sh src/dev/code_coverage/ingest_coverage/team_assignment/ingestion_pipeline.json
  """, title)

}

return this
